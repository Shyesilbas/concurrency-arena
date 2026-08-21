package com.serhat.concurrencyarena.controller;

import com.serhat.concurrencyarena.dto.LoginRequest;
import com.serhat.concurrencyarena.dto.UserDto;
import com.serhat.concurrencyarena.dto.response.ApiResponse;
import com.serhat.concurrencyarena.entity.User;
import com.serhat.concurrencyarena.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserDto>> loginOrRegister(@RequestBody LoginRequest request) {
        String email = request.email() != null ? request.email().trim().toLowerCase() : "";
        if (email.isEmpty()) {
            email = "demo.user@concurrencyarena.com";
        }

        final String userEmail = email;
        User user = userRepository.findByEmail(userEmail).orElseGet(() -> {
            String uname = request.username() != null && !request.username().isBlank()
                    ? request.username().trim()
                    : userEmail.split("@")[0];
            User newUser = User.builder()
                    .email(userEmail)
                    .username(uname)
                    .build();
            return userRepository.save(newUser);
        });

        UserDto dto = new UserDto(user.getId(), user.getUsername(), user.getEmail());
        return ResponseEntity.ok(ApiResponse.ok(dto, "Logged in successfully."));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(@RequestParam(defaultValue = "1") Long id) {
        User user = userRepository.findById(id).orElseGet(() -> userRepository.findAll().stream().findFirst().orElse(null));
        if (user == null) {
            User demo = userRepository.save(User.builder().email("demo@test.com").username("Demo User").build());
            return ResponseEntity.ok(ApiResponse.ok(new UserDto(demo.getId(), demo.getUsername(), demo.getEmail())));
        }
        return ResponseEntity.ok(ApiResponse.ok(new UserDto(user.getId(), user.getUsername(), user.getEmail())));
    }
}
