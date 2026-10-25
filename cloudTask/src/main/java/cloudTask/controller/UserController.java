package cloudtask.controller;

import cloudtask.model.User;
import cloudtask.model.Role;
import cloudtask.repository.TaskRepository;
import cloudtask.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    public UserController(UserRepository userRepository, TaskRepository taskRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
    }

    public record RegistrationRequest(
            @NotBlank @Size(max = 255) String username,
            @NotBlank @Size(max = 255) String password,
            @Size(max = 255) String fullName,
            @NotNull Role role) {}

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public User createUser(@Valid @RequestBody RegistrationRequest request) {
        String username = request.username().trim();
        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce nom d'utilisateur existe déjà.");
        }
        return userRepository.saveAndFlush(
                new User(username, request.password(), request.fullName(), request.role()));
    }

    @PostMapping("/login")
    public User loginUser(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Nom d'utilisateur ou mot de passe incorrect."));
        if (!Objects.equals(user.getPassword(), request.password())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Nom d'utilisateur ou mot de passe incorrect.");
        }
        return user;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur non trouvé : " + id));
        if (taskRepository.existsByAssignedUserId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Supprimez ou réassignez les tâches de cet utilisateur avant de le supprimer.");
        }
        userRepository.delete(user);
        userRepository.flush();
    }
}