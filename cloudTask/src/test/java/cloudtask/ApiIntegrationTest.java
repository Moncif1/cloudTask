package cloudtask;

import cloudtask.repository.TaskRepository;
import cloudtask.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.config.import=",
        "spring.datasource.url=jdbc:h2:mem:cloudtask-test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class ApiIntegrationTest {
    @Value("${local.server.port}")
    private int port;

    @Autowired
    private TaskRepository tasks;
    @Autowired
    private UserRepository users;

    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void clearTestDatabase() {
        tasks.deleteAll();
        users.deleteAll();
    }

    private HttpResponse<String> request(String method, String path, String body) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(body))
                .build(), HttpResponse.BodyHandlers.ofString());
    }

    private long register(String username) throws Exception {
        var response = request("POST", "/api/users", """
                {"username":"%s","password":"test-password","role":"MEMBRE"}
                """.formatted(username));
        assertEquals(201, response.statusCode(), response.body());
        assertFalse(json.readTree(response.body()).has("password"));
        return json.readTree(response.body()).get("id").asLong();
    }

    private String taskBody(long userId, String dueDate) {
        return """
                {"title":" Test task ","priority":1,"completed":false,
                 "dueDate":%s,"assignedUser":{"id":%d}}
                """.formatted(dueDate == null ? "null" : "\"" + dueDate + "\"", userId);
    }

    @Test
    void registrationLoginAndUserListNeverExposePasswords() throws Exception {
        register("alice");
        var response = request("POST", "/api/users/login",
                """
                {"username":" alice ","password":"test-password"}
                """);
        assertEquals(200, response.statusCode(), response.body());
        assertFalse(json.readTree(response.body()).has("password"));
        response = request("GET", "/api/users", null);
        assertEquals(200, response.statusCode());
        assertFalse(json.readTree(response.body()).get(0).has("password"));
    }

    @Test
    void duplicateUsernameReturnsConflictNotNotFound() throws Exception {
        register("alice");
        var response = request("POST", "/api/users", """
                {"username":" alice ","password":"other","role":"CHEF_DE_PROJET"}
                """);
        assertEquals(409, response.statusCode(), response.body());
        assertTrue(json.readTree(response.body()).get("message").asText().contains("existe"));
    }

    @Test
    void invalidRegistrationAndCredentialsReturnAppropriateStatuses() throws Exception {
        assertEquals(400, request("POST", "/api/users",
                """
                {"username":" ","password":"test","role":"MEMBRE"}
                """).statusCode());
        assertEquals(400, request("POST", "/api/users",
                """
                {"username":"alice","password":"test","role":null}
                """).statusCode());
        assertEquals(401, request("POST", "/api/users/login",
                """
                {"username":"missing","password":"wrong"}
                """).statusCode());
        register("alice");
        assertEquals(401, request("POST", "/api/users/login",
                """
                {"username":"alice","password":"wrong"}
                """).statusCode());
    }

    @Test
    void taskLifecycleResolvesAssigneeAndHidesPassword() throws Exception {
        long userId = register("alice");
        var created = request("POST", "/api/tasks", taskBody(userId, "2026-12-01"));
        assertEquals(201, created.statusCode(), created.body());
        JsonNode task = json.readTree(created.body());
        assertEquals("Test task", task.get("title").asText());
        assertEquals("alice", task.get("assignedUser").get("username").asText());
        assertFalse(task.get("assignedUser").has("password"));
        long taskId = task.get("id").asLong();
        var updated = request("PUT", "/api/tasks/" + taskId, """
                {"title":"Updated","completed":true,"priority":2,"dueDate":null,"assignedUser":null}
                """);
        assertEquals(200, updated.statusCode(), updated.body());
        assertTrue(json.readTree(updated.body()).get("completed").asBoolean());
        assertTrue(json.readTree(updated.body()).get("assignedUser").isNull());
        assertEquals(204, request("DELETE", "/api/tasks/" + taskId, null).statusCode());
        assertEquals(404, request("DELETE", "/api/tasks/" + taskId, null).statusCode());
    }

    @Test
    void rejectsInvalidTasksAndMissingAssignees() throws Exception {
        assertEquals(400, request("POST", "/api/tasks",
                """
                {"title":" ","priority":1}
                """).statusCode());
        assertEquals(400, request("POST", "/api/tasks",
                """
                {"title":"Task","priority":4}
                """).statusCode());
        assertEquals(400, request("POST", "/api/tasks",
                """
                {"title":"Task","priority":1,"assignedUser":{}}
                """).statusCode());
        assertEquals(400, request("POST", "/api/tasks",
                """
                {"title":"Task","priority":1,"dueDate":"invalid"}
                """).statusCode());
        assertEquals(404, request("POST", "/api/tasks", taskBody(999999, null)).statusCode());
        assertEquals(404, request("PUT", "/api/tasks/999999",
                """
                {"title":"Task","priority":1}
                """).statusCode());
    }

    @Test
    void userWithAssignedTasksCannotBeDeleted() throws Exception {
        long id = register("alice");
        var created = request("POST", "/api/tasks", taskBody(id, null));
        assertEquals(201, created.statusCode(), created.body());
        assertEquals(409, request("DELETE", "/api/users/" + id, null).statusCode());
        long taskId = json.readTree(created.body()).get("id").asLong();
        assertEquals(204, request("DELETE", "/api/tasks/" + taskId, null).statusCode());
        assertEquals(204, request("DELETE", "/api/users/" + id, null).statusCode());
        assertEquals(404, request("DELETE", "/api/users/" + id, null).statusCode());
    }

    @Test
    void filteringAndSortingKeepUndatedTasks() throws Exception {
        long id = register("alice");
        assertEquals(201, request("POST", "/api/tasks", taskBody(id, null)).statusCode());
        assertEquals(201, request("POST", "/api/tasks", taskBody(id, "2026-12-02")).statusCode());
        assertEquals(201, request("POST", "/api/tasks", taskBody(id, "2026-12-01")).statusCode());
        JsonNode sorted = json.readTree(request("GET", "/api/tasks/sorted/date", null).body());
        assertEquals(3, sorted.size());
        assertEquals("2026-12-01", sorted.get(0).get("dueDate").asText());
        assertTrue(sorted.get(2).get("dueDate").isNull());
        for (String path : new String[]{"/api/tasks/user/" + id,
                "/api/tasks/search/user?username=ALI", "/api/tasks/priority/1",
                "/api/tasks/completed/false"}) {
            var response = request("GET", path, null);
            assertEquals(200, response.statusCode(), response.body());
            assertEquals(3, json.readTree(response.body()).size());
        }
        assertEquals(400, request("GET", "/api/tasks/priority/4", null).statusCode());
        assertEquals(400, request("GET", "/api/tasks/completed/not-a-boolean", null).statusCode());
    }

    @Test
    void corsPreflightAllowsBothLocalFrontendOrigins() throws Exception {
        for (String origin : new String[]{"http://localhost:5173", "http://127.0.0.1:5173"}) {
            var response = client.send(HttpRequest.newBuilder(
                            URI.create("http://localhost:" + port + "/api/users"))
                    .header("Origin", origin)
                    .header("Access-Control-Request-Method", "POST")
                    .header("Access-Control-Request-Headers", "content-type")
                    .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build(),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, response.statusCode(), response.body());
            assertEquals(origin, response.headers().firstValue("Access-Control-Allow-Origin").orElse(""));
        }
    }

    @Test
    void apiDocumentationLoadsWithCurrentSpringBoot() throws Exception {
        var response = request("GET", "/v3/api-docs", null);
        assertEquals(200, response.statusCode(), response.body());
        assertTrue(json.readTree(response.body()).get("paths").has("/api/users"));
    }
}
