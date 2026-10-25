package cloudtask.repository;

import cloudtask.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    boolean existsByAssignedUserId(Long userId);

    // Requête explicite pour éviter les erreurs de syntaxe Spring Data JPA
    @Query("SELECT t FROM Task t WHERE t.assignedUser.id = :userId")
    List<Task> findByAssignedUserId(@Param("userId") Long userId);

    // Optionnel : Trouver par nom d'utilisateur (username)
    List<Task> findByAssignedUserUsername(String username);

    // Pour trier automatiquement par date d'échéance croissante
    List<Task> findAllByOrderByDueDateAsc();

    // Pour trier par priorité
    List<Task> findAllByOrderByPriorityAsc();

    // Permet de trouver toutes les tâches ayant une priorité spécifique
    List<Task> findByPriority(int priority);

    // Permet de trouver toutes les tâches selon leur statut (terminée ou non)
    List<Task> findByCompleted(boolean completed);

    // Recherche partielle par nom d'utilisateur (insensible à la casse)
    List<Task> findByAssignedUserUsernameContainingIgnoreCase(String username);

    @Query("SELECT t FROM Task t ORDER BY CASE WHEN t.dueDate IS NULL THEN 1 ELSE 0 END, t.dueDate ASC, t.id ASC")
    List<Task> findAllSortedByDueDate();
}
