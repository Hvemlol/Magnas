using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Platform.Api.Data;
using Platform.Api.DTOs;
using Platform.Api.Models;

namespace Platform.Api.Services
{
    public interface IAuthService
    {
        Task<(AuthResponse? response, string? error)> RegisterAsync(RegisterRequest request);
        Task<(AuthResponse? response, string? error)> LoginAsync(LoginRequest request);
    }

    public class AuthService : IAuthService
    {
        private readonly PlatformContext _context;
        private readonly string _jwtSecret;
        private readonly ILogger<AuthService> _logger;

        public AuthService(PlatformContext context, IConfiguration config, ILogger<AuthService> logger)
        {
            _context = context;
            _jwtSecret = config["JwtSecret"];
            _logger = logger;
        }

        public async Task<(AuthResponse? response, string? error)> RegisterAsync(RegisterRequest request)
        {
            bool emailTaken = await _context.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (emailTaken)
            {
                _logger.LogWarning("Registration rejected: email already registered ({Email})", request.Email);
                return (null, "An account with that email already exists.");
            }

            string salt = GenerateSalt();
            string hash = HashPassword(request.Password, salt);

            var user = new User
            {
                Email = request.Email,
                Username = request.Username,
                PasswordHash = hash,
                Salt = salt,
                Role = request.Role,
                CompanyName = request.CompanyName,
                CreatedDate = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("New {Role} registered: userId={UserId} email={Email}",
                user.Role, user.Id, user.Email);
            return (BuildAuthResponse(user), null);
        }

        public async Task<(AuthResponse? response, string? error)> LoginAsync(LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Email.ToLower() == request.Email.ToLower());

            if (user == null)
            {
                _logger.LogWarning("Failed login: no account for {Email}", request.Email);
                return (null, "Invalid email or password.");
            }

            string hash = HashPassword(request.Password, user.Salt);
            if (!string.Equals(hash, user.PasswordHash, StringComparison.Ordinal))
            {
                _logger.LogWarning("Failed login: wrong password for userId={UserId}", user.Id);
                return (null, "Invalid email or password.");
            }

            _logger.LogInformation("Login: userId={UserId} role={Role}", user.Id, user.Role);
            return (BuildAuthResponse(user), null);
        }

        private AuthResponse BuildAuthResponse(User user)
        {
            return new AuthResponse
            {
                Token = GenerateToken(user),
                UserId = user.Id,
                Username = user.Username,
                Role = user.Role.ToString()
            };
        }

        private string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim("userId", user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(30),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static string GenerateSalt()
        {
            byte[] saltBytes = new byte[16];
            RandomNumberGenerator.Fill(saltBytes);
            return Convert.ToHexString(saltBytes).ToLower();
        }

        private static string HashPassword(string password, string salt)
        {
            byte[] saltBytes = Convert.FromHexString(salt);
            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                saltBytes,
                iterations: 100_000,
                hashAlgorithm: HashAlgorithmName.SHA256,
                outputLength: 32);
            return Convert.ToHexString(hash).ToLower();
        }
    }
}
