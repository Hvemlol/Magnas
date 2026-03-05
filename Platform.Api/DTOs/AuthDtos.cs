using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Platform.Api.Models;

namespace Platform.Api.DTOs
{
    public class RegisterRequest
    {
        [Required][EmailAddress][StringLength(254)]
        public string Email { get; set; }

        [Required][StringLength(50, MinimumLength = 2)]
        public string Username { get; set; }

        [Required][StringLength(100, MinimumLength = 6)]
        public string Password { get; set; }

        public UserRole Role { get; set; }

        [StringLength(200)]
        public string CompanyName { get; set; }
    }

    public class LoginRequest
    {
        [Required][EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
    }

    public class AuthResponse
    {
        [JsonIgnore]
        public string Token { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; }
        public string Role { get; set; }
    }
}