package cloudtask.controller;

import cloudtask.model.Task;
import cloudtask.model.User;
import cloudtask.repository.TaskRepository;
import cloudtask.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskController(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public record AssignedUser(@NotNull @Positive Long id) {}

    public record TaskRequest(
            @NotBlank @Size(max = 255) String title,
            Boolean completed,
            @NotNull @Min(1) @Max(3) Integer priority,
            LocalDate dueDate,
            @Valid AssignedUser assignedUser) {}

    private User resolveUser(AssignedUser assignedUser) {
        return assignedUser == null ? null : userRepository.findById(assignedUser.id())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Utilisateur non trouvé : " + assignedUser.id()));
    }

    @GetMapping
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task createTask(@Valid @RequestBody TaskRequest request) {
        return taskRepository.saveAndFlush(new Task(request.title().trim(), Boolean.TRUE.equals(request.completed()),
                request.priority(), request.dueDate(), resolveUser(request.assignedUser())));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable Long id) {
        Task task = taskRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Tâche non trouvée : " + id));
        taskRepository.delete(task);
        taskRepository.flush();
    }

    @PutMapping("/{id}")
    public Task updateTask(@PathVariable Long id, @Valid @RequestBody TaskRequest taskDetails) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Tâche non trouvée : " + id));

        task.setTitle(taskDetails.title().trim());
        task.setCompleted(Boolean.TRUE.equals(taskDetails.completed()));
        task.setPriority(taskDetails.priority());
        task.setDueDate(taskDetails.dueDate());
        task.setAssignedUser(resolveUser(taskDetails.assignedUser()));

        return taskRepository.saveAndFlush(task);
    }

    // Route pour filtrer par priorité : /api/tasks/priority/1
    @GetMapping("/priority/{priority}")
    public List<Task> getTasksByPriority(@PathVariable @Min(1) @Max(3) int priority) {
        return taskRepository.findByPriority(priority);
    }

    // Route pour filtrer par statut : /api/tasks/completed/true ou /false
    @GetMapping("/completed/{status}")
    public List<Task> getTasksByCompletedStatus(@PathVariable boolean status) {
        return taskRepository.findByCompleted(status);
    }

    // Récupérer les tâches d'un utilisateur spécifique par son ID
    @GetMapping("/user/{userId}")
    public List<Task> getTasksByUser(@PathVariable Long userId) {
        return taskRepository.findByAssignedUserId(userId);
    }

    // NOUVELLE ROUTE : Rechercher les tâches par nom d'utilisateur (recherche partielle)
    @GetMapping("/search/user")
    public List<Task> getTasksByUsername(@RequestParam String username) {
        return taskRepository.findByAssignedUserUsernameContainingIgnoreCase(username);
    }



    @GetMapping("/sorted/date")
    public List<Task> getTasksSortedByDate() {
        return taskRepository.findAllSortedByDueDate();
    }
}
