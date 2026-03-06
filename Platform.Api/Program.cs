using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Platform.Api.Data;
using Platform.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<PlatformContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IElementService, ElementService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<ISavedProductService, SavedProductService>();

// JWT authentication
var jwtSecret = builder.Configuration["JwtSecret"];
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Cookies.TryGetValue("access_token", out var token))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// CORS — origins read from config (AllowedOrigins, comma-separated)
var allowedOrigins = (builder.Configuration["AllowedOrigins"] ?? "http://localhost:5173,http://localhost:5174")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// Rate limiting — partitioned by IP so each client gets its own bucket
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Login: 10 attempts per IP per minute
    options.AddPolicy("login", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window      = TimeSpan.FromMinutes(1),
                QueueLimit  = 0
            }));

    // Register: 5 attempts per IP per hour
    options.AddPolicy("register", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window      = TimeSpan.FromHours(1),
                QueueLimit  = 0
            }));
});

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();

// Swagger with JWT support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Platform API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

// Apply migrations and seed demo data
var startupLog = app.Logger;
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PlatformContext>();

    startupLog.LogInformation("Applying database migrations...");
    db.Database.Migrate();
    startupLog.LogInformation("Migrations applied.");

    if (!db.Users.Any())
    {
        startupLog.LogInformation("Seeding demo data...");
        static string MakeSalt() {
            byte[] b = new byte[16];
            System.Security.Cryptography.RandomNumberGenerator.Fill(b);
            return Convert.ToHexString(b).ToLower();
        }
        static string HashPw(string pw, string salt) {
            byte[] saltBytes = Convert.FromHexString(salt);
            byte[] hash = System.Security.Cryptography.Rfc2898DeriveBytes.Pbkdf2(
                pw, saltBytes, iterations: 100_000,
                hashAlgorithm: System.Security.Cryptography.HashAlgorithmName.SHA256,
                outputLength: 32);
            return Convert.ToHexString(hash).ToLower();
        }
        static Platform.Api.Models.User MakeUser(string email, string username, Platform.Api.Models.UserRole role,
            string? company, string? bio, string? location, string? website, string? linkedin, int daysAgo) {
            var salt = MakeSalt();
            return new Platform.Api.Models.User {
                Email = email, Username = username, Role = role,
                CompanyName = company, Bio = bio, Location = location,
                Website = website, LinkedIn = linkedin,
                Salt = salt, PasswordHash = HashPw("demo1234", salt),
                CreatedDate = DateTime.UtcNow.AddDays(-daysAgo)
            };
        }

        // ── Demo accounts ─────────────────────────────────────
        var architect = MakeUser("architect@demo.com", "demo_architect", Platform.Api.Models.UserRole.Architect,
            null, null, null, null, null, 10);

        // ── Manufacturers ──────────────────────────────────────
        var claddingCo = MakeUser("hello@nordicfacades.com", "nordic_facades", Platform.Api.Models.UserRole.Manufacturer,
            "Nordic Facades Ltd",
            "Specialists in high-performance rainscreen cladding and facade systems for commercial and residential buildings. Over 25 years of experience delivering certified, low-maintenance envelope solutions across the UK and Europe.",
            "Edinburgh, UK",
            "https://nordicfacades.com",
            "https://linkedin.com/company/nordic-facades",
            520);

        var timberCo = MakeUser("info@grainworks.co.uk", "grainworks", Platform.Api.Models.UserRole.Manufacturer,
            "Grainworks Timber",
            "Sustainably sourced structural and decorative timber products, from cross-laminated panels to bespoke glulam beams. FSC-certified supply chain, fabricated to spec at our mill in Inverness.",
            "Inverness, UK",
            "https://grainworks.co.uk",
            "https://linkedin.com/company/grainworks-timber",
            380);

        var concreteCo = MakeUser("studio@betonco.com", "beton_co", Platform.Api.Models.UserRole.Manufacturer,
            "Béton & Co.",
            "Architectural precast concrete, polished flooring, and GRC facade panels. We work closely with architects at every stage — from mix design and finish samples to full installation drawings.",
            "Manchester, UK",
            "https://betonco.com",
            "https://linkedin.com/company/beton-co",
            260);

        var glazingCo = MakeUser("sales@aluframe.co.uk", "aluframe_systems", Platform.Api.Models.UserRole.Manufacturer,
            "Aluframe Systems",
            "Precision-engineered aluminium curtain wall, window and door systems. All profiles are thermally broken and available in any RAL colour. Certified to PAS 24 and Secured by Design.",
            "Birmingham, UK",
            "https://aluframe.co.uk",
            "https://linkedin.com/company/aluframe-systems",
            700);

        var stoneCo = MakeUser("quarry@terrastone.co.uk", "terrastone", Platform.Api.Models.UserRole.Manufacturer,
            "TerraStone Quarries",
            "Natural stone direct from our own quarries in the Cotswolds and Wales. Portland limestone, Welsh slate, and Yorkstone for paving, cladding, and heritage restoration. Samples on request.",
            "Cirencester, UK",
            "https://terrastone.co.uk",
            "https://linkedin.com/company/terrastone-quarries",
            900);

        var manufacturers = new[] { claddingCo, timberCo, concreteCo, glazingCo, stoneCo };
        db.Users.Add(architect);
        db.Users.AddRange(manufacturers);
        db.SaveChanges();

        // ── Products ───────────────────────────────────────────
        var now = DateTime.UtcNow;
        var products = new List<Platform.Api.Models.Product>
        {
            // Nordic Facades — Cladding
            new() { ManufacturerId = claddingCo.Id, IsPublished = true, CreatedDate = now.AddDays(-30), UpdatedDate = now.AddDays(-30),
                Name = "Fibre Cement Rainscreen Panel",
                Description = "Large-format 8mm fibre cement board, factory primed, available in 12 standard colours. Suitable for direct-fix or open-joint rainscreen systems. Non-combustible, dimensionally stable, and resistant to moisture and impact.",
                Category = "Cladding", Material = "Fibre Cement", DeclaredUnit = "per m²",
                FireRating = "A2-s1,d0", ThermalPerformance = "λ = 0.25 W/mK",
                Certifications = "CE marked, BBA certified, UKCA",
                GwpA1A3 = 12.4m, GwpB4 = 24.8m, GwpC3 = 1.2m, GwpC4 = 0.8m },
            new() { ManufacturerId = claddingCo.Id, IsPublished = true, CreatedDate = now.AddDays(-28), UpdatedDate = now.AddDays(-28),
                Name = "Zinc Cassette Panel",
                Description = "Pre-weathered zinc cassette system with concealed fixings. 1mm standing seam zinc, anthra or natural finish. Suitable for ventilated facades on commercial and residential projects.",
                Category = "Cladding", Material = "Zinc", DeclaredUnit = "per m²",
                FireRating = "A1", ThermalPerformance = "λ = 110 W/mK",
                Certifications = "CE marked, UKCA, ISO 9001",
                GwpA1A3 = 8.7m, GwpC3 = 0.5m, GwpC4 = 0.3m },
            new() { ManufacturerId = claddingCo.Id, IsPublished = true, CreatedDate = now.AddDays(-20), UpdatedDate = now.AddDays(-20),
                Name = "HPL Compact Cladding Board",
                Description = "High-pressure laminate cladding in 6 and 8mm thicknesses. 60+ decors including wood grain, stone, and solid colour. Suitable for external facades and soffits.",
                Category = "Cladding", Material = "HPL Laminate", DeclaredUnit = "per m²",
                FireRating = "B-s1,d0", ThermalPerformance = "λ = 0.29 W/mK",
                Certifications = "CE marked, EN 438-7, ETA certified",
                GwpA1A3 = 18.2m, GwpB4 = 36.4m, GwpC3 = 2.8m, GwpC4 = 1.5m },
            new() { ManufacturerId = claddingCo.Id, IsPublished = true, CreatedDate = now.AddDays(-14), UpdatedDate = now.AddDays(-14),
                Name = "Aluminium Composite Panel (ACP)",
                Description = "3mm ACM panels with polyester or PVDF coating. FR core as standard. Available in coil-coated finishes or custom digital print for large-format facades.",
                Category = "Cladding", Material = "Aluminium Composite", DeclaredUnit = "per m²",
                FireRating = "B-s1,d0", ThermalPerformance = "λ = 0.11 W/mK",
                Certifications = "CE marked, CWCT tested, EN 13501-1",
                GwpA1A3 = 22.8m, GwpB4 = 22.8m, GwpC3 = 3.1m, GwpC4 = 1.8m },
            new() { ManufacturerId = claddingCo.Id, IsPublished = true, CreatedDate = now.AddDays(-5), UpdatedDate = now.AddDays(-5),
                Name = "Ventilated Facade Subframe System",
                Description = "Thermally broken aluminium subframe for rainscreen cladding. Compatible with most panel types. Accommodates building movement and thermal expansion.",
                Category = "Cladding", Material = "Aluminium", DeclaredUnit = "per m²",
                FireRating = "A1", Certifications = "CE marked, BS EN 1090-1, ETA",
                GwpA1A3 = 6.1m, GwpC3 = 0.8m, GwpC4 = 0.5m },

            // Grainworks — Timber
            new() { ManufacturerId = timberCo.Id, IsPublished = true, CreatedDate = now.AddDays(-60), UpdatedDate = now.AddDays(-60),
                Name = "Cross-Laminated Timber (CLT) Panel",
                Description = "3, 5 and 7-layer CLT panels in spruce or Douglas fir. Available in standard or custom widths up to 3m. Suitable for floors, walls, and roofs in mass-timber construction.",
                Category = "Timber", Material = "Spruce / Douglas Fir", DeclaredUnit = "per m³",
                FireRating = "D-s2,d0", ThermalPerformance = "λ = 0.13 W/mK", AcousticRating = "Rw 36 dB (bare panel)",
                Certifications = "CE marked, EN 16351, FSC certified, PEFC",
                GwpA1A3 = -514.0m, GwpC3 = -180.0m, GwpC4 = 2.5m },
            new() { ManufacturerId = timberCo.Id, IsPublished = true, CreatedDate = now.AddDays(-55), UpdatedDate = now.AddDays(-55),
                Name = "Glulam Beam — GL28h",
                Description = "Glued laminated softwood beams to EN 14080. Supplied planed and visually graded. Standard sections or bespoke curved profiles to order. Ideal for exposed structural applications.",
                Category = "Timber", Material = "Glued Laminated Softwood", DeclaredUnit = "per m³",
                FireRating = "D-s2,d0", ThermalPerformance = "λ = 0.13 W/mK",
                Certifications = "CE marked, EN 14080, FSC certified",
                GwpA1A3 = -890.0m, GwpC3 = -290.0m, GwpC4 = 4.2m },
            new() { ManufacturerId = timberCo.Id, IsPublished = true, CreatedDate = now.AddDays(-40), UpdatedDate = now.AddDays(-40),
                Name = "Siberian Larch Cladding",
                Description = "Kiln-dried Siberian larch in feather-edge, shiplap, and square-edge profiles. Pre-treated with microporous stain in 8 colours or untreated for natural silver-grey patina.",
                Category = "Cladding", Material = "Siberian Larch", DeclaredUnit = "per m²",
                FireRating = "D-s2,d0", ThermalPerformance = "λ = 0.13 W/mK",
                Certifications = "FSC certified, PEFC, Natureplus",
                GwpA1A3 = -62.0m, GwpB4 = -31.0m, GwpC3 = -22.0m, GwpC4 = 1.8m },
            new() { ManufacturerId = timberCo.Id, IsPublished = true, CreatedDate = now.AddDays(-22), UpdatedDate = now.AddDays(-22),
                Name = "Engineered Oak Flooring",
                Description = "15mm 3-ply engineered oak with 4mm wear layer. Brushed and UV-oiled or lacquered. Suitable for underfloor heating. Available in 190mm and 260mm widths.",
                Category = "Flooring", Material = "Engineered Oak", DeclaredUnit = "per m²",
                FireRating = "Dfl-s1", Certifications = "FSC certified, PEFC, CE marked",
                GwpA1A3 = -28.4m, GwpB4 = -14.2m, GwpC3 = -10.0m, GwpC4 = 1.2m },
            new() { ManufacturerId = timberCo.Id, IsPublished = true, CreatedDate = now.AddDays(-8), UpdatedDate = now.AddDays(-8),
                Name = "Thermally Modified Ash Decking",
                Description = "Thermally modified ash for exterior decking. Class 1 natural durability without chemical treatment. Dimensionally stable. Available grooved or smooth.",
                Category = "Flooring", Material = "Thermally Modified Ash", DeclaredUnit = "per m²",
                FireRating = "D-s2,d0", Certifications = "FSC certified, ThermoWood certified",
                GwpA1A3 = -44.0m, GwpB4 = -22.0m, GwpC3 = -16.0m, GwpC4 = 1.5m },

            // Béton & Co. — Concrete
            new() { ManufacturerId = concreteCo.Id, IsPublished = true, CreatedDate = now.AddDays(-45), UpdatedDate = now.AddDays(-45),
                Name = "Architectural Precast Facade Panel",
                Description = "Custom precast concrete panels in board-marked, bush-hammered, and polished finishes. Pigmented concrete available. Insulated sandwich panels with integrated insulation also supplied.",
                Category = "Concrete", Material = "Precast Concrete", DeclaredUnit = "per m²",
                FireRating = "A1", ThermalPerformance = "U = 0.18 W/m²K (insulated)", AcousticRating = "Rw 52 dB",
                Certifications = "CE marked, EN 14992, BBA certified",
                GwpA1A3 = 210.5m, GwpC3 = 4.5m, GwpC4 = 8.2m },
            new() { ManufacturerId = concreteCo.Id, IsPublished = true, CreatedDate = now.AddDays(-38), UpdatedDate = now.AddDays(-38),
                Name = "Polished Concrete Floor Screed",
                Description = "Flow-applied levelling screed with integral colour and sealer. Polished to 400 or 800 grit. Suitable for new-build and retrofit applications over underfloor heating.",
                Category = "Flooring", Material = "Polished Concrete", DeclaredUnit = "per m²",
                FireRating = "A1", ThermalPerformance = "λ = 1.4 W/mK",
                Certifications = "CE marked, EN 13813",
                GwpA1A3 = 44.0m, GwpB4 = 44.0m, GwpC3 = 2.8m, GwpC4 = 5.5m },
            new() { ManufacturerId = concreteCo.Id, IsPublished = true, CreatedDate = now.AddDays(-30), UpdatedDate = now.AddDays(-30),
                Name = "GRC Thin-Shell Facade Panel",
                Description = "Glass-fibre reinforced concrete facade panels from 12mm thickness. Lightweight alternative to full precast — typically 75% lighter. Complex geometries and surface textures achievable.",
                Category = "Cladding", Material = "GRC (Glass Reinforced Concrete)", DeclaredUnit = "per m²",
                FireRating = "A1", Certifications = "CE marked, EN 1169, GRCA member",
                GwpA1A3 = 85.0m, GwpC3 = 3.5m, GwpC4 = 4.8m },
            new() { ManufacturerId = concreteCo.Id, IsPublished = true, CreatedDate = now.AddDays(-15), UpdatedDate = now.AddDays(-15),
                Name = "Exposed Aggregate Paving Slab",
                Description = "450×450mm and 600×600mm exposed aggregate concrete slabs in flint, granite, and basalt finishes. Anti-slip rating R11. Frost resistant.",
                Category = "Paving", Material = "Exposed Aggregate Concrete", DeclaredUnit = "per m²",
                FireRating = "A1", Certifications = "CE marked, EN 1339, BBA certified",
                GwpA1A3 = 32.0m, GwpB4 = 32.0m, GwpC3 = 1.8m, GwpC4 = 3.5m },
            new() { ManufacturerId = concreteCo.Id, IsPublished = true, CreatedDate = now.AddDays(-3), UpdatedDate = now.AddDays(-3),
                Name = "Micro-Cement Wall Coating",
                Description = "2mm skim-coat micro-cement for walls and floors. Seamless finish, waterproof when sealed. Available in 20 colours. Suitable for wet areas.",
                Category = "Concrete", Material = "Micro-Cement", DeclaredUnit = "per m²",
                FireRating = "A1", Certifications = "EN 13813, VOC compliant, REACH",
                GwpA1A3 = 9.8m, GwpB4 = 9.8m, GwpC3 = 0.5m, GwpC4 = 0.8m },

            // Aluframe Systems — Glazing & Aluminium
            new() { ManufacturerId = glazingCo.Id, IsPublished = true, CreatedDate = now.AddDays(-90), UpdatedDate = now.AddDays(-90),
                Name = "Thermally Broken Curtain Wall System",
                Description = "50mm and 65mm mullion aluminium curtain wall for commercial facades. Factory-assembled modules available. Tested to CWCT TM11 wind and water penetration.",
                Category = "Glazing", Material = "Aluminium / Structural Glass", DeclaredUnit = "per m²",
                FireRating = "A1 (frame)", ThermalPerformance = "Uf = 1.4 W/m²K, Uw from 1.6 W/m²K", AcousticRating = "Rw 44 dB",
                Certifications = "CE marked, EN 13830, CWCT tested, PAS 24",
                GwpA1A3 = 38.5m, GwpB6 = 145.0m, GwpC3 = 4.2m, GwpC4 = 2.1m },
            new() { ManufacturerId = glazingCo.Id, IsPublished = true, CreatedDate = now.AddDays(-75), UpdatedDate = now.AddDays(-75),
                Name = "Aluminium Tilt & Turn Window",
                Description = "Thermally broken aluminium tilt-and-turn window. Frame depth 70mm, glazing rebate accepts up to 52mm units. Available in any RAL colour or standard anodised finish.",
                Category = "Glazing", Material = "Aluminium", DeclaredUnit = "per unit",
                FireRating = "A1 (frame)", ThermalPerformance = "Uf = 1.4 W/m²K, Uw from 1.2 W/m²K", AcousticRating = "Rw 42 dB",
                Certifications = "PAS 24, Secured by Design, CE marked, EN 14351-1",
                GwpA1A3 = 52.0m, GwpB6 = 180.0m, GwpC3 = 5.8m, GwpC4 = 2.8m },
            new() { ManufacturerId = glazingCo.Id, IsPublished = true, CreatedDate = now.AddDays(-50), UpdatedDate = now.AddDays(-50),
                Name = "Structural Glass Balustrade",
                Description = "12mm or 12.8mm laminated toughened glass panels in channel-fix or standoff systems. Available frameless or with aluminium capping rail. Suitable for interior and exterior applications.",
                Category = "Glazing", Material = "Laminated Toughened Glass", DeclaredUnit = "per m²",
                FireRating = "A1", AcousticRating = "Rw 38 dB",
                Certifications = "CE marked, EN 12600, BS 6180, NHBC accepted",
                GwpA1A3 = 28.0m, GwpC3 = 2.5m, GwpC4 = 1.2m },
            new() { ManufacturerId = glazingCo.Id, IsPublished = true, CreatedDate = now.AddDays(-30), UpdatedDate = now.AddDays(-30),
                Name = "Aluminium Bi-Fold Door System",
                Description = "Slim sightline bi-fold door in thermally broken aluminium. Up to 6 leaves, spanning up to 6.5m unobstructed. Low threshold for level access.",
                Category = "Glazing", Material = "Aluminium", DeclaredUnit = "per unit",
                FireRating = "A1 (frame)", ThermalPerformance = "Uf = 1.6 W/m²K",
                Certifications = "PAS 24, Secured by Design, CE marked, Kitemark",
                GwpA1A3 = 74.0m, GwpB6 = 95.0m, GwpC3 = 7.2m, GwpC4 = 3.5m },
            new() { ManufacturerId = glazingCo.Id, IsPublished = true, CreatedDate = now.AddDays(-10), UpdatedDate = now.AddDays(-10),
                Name = "Louvre Blade Facade Screen",
                Description = "Fixed or adjustable aerofoil aluminium louvre blades for solar shading and natural ventilation. Blade spacing from 50–200mm. Motorised options with BMS integration available.",
                Category = "Cladding", Material = "Aluminium", DeclaredUnit = "per m²",
                FireRating = "A1", Certifications = "CE marked, BS EN 1090, ISO 9001",
                GwpA1A3 = 18.0m, GwpB4 = 18.0m, GwpC3 = 2.0m, GwpC4 = 1.0m },

            // TerraStone — Natural Stone
            new() { ManufacturerId = stoneCo.Id, IsPublished = true, CreatedDate = now.AddDays(-120), UpdatedDate = now.AddDays(-120),
                Name = "Portland Limestone — Bed Ashlar",
                Description = "Coursed Portland limestone ashlar blocks quarried in Dorset. Traditional and contemporary finishes: sawn, tooled, and hand-dressed. Suitable for new-build and heritage restoration.",
                Category = "Masonry", Material = "Portland Limestone", DeclaredUnit = "per m²",
                FireRating = "A1", ThermalPerformance = "λ = 1.59 W/mK",
                Certifications = "CE marked, EN 771-6, BRE verified",
                GwpA1A3 = 58.0m, GwpC3 = 3.5m, GwpC4 = 5.8m },
            new() { ManufacturerId = stoneCo.Id, IsPublished = true, CreatedDate = now.AddDays(-110), UpdatedDate = now.AddDays(-110),
                Name = "Welsh Slate Roofing",
                Description = "Natural Welsh slate from the Penrhyn quarry. 400×200mm and 500×250mm standard sizes. Guaranteed for 100+ years. One of the lowest embodied carbon roofing products available.",
                Category = "Roofing", Material = "Natural Slate", DeclaredUnit = "per m²",
                FireRating = "A1", Certifications = "BBA certified, CE marked, EN 12326, NHBC accepted",
                GwpA1A3 = 4.2m, GwpC3 = 0.8m, GwpC4 = 2.2m },
            new() { ManufacturerId = stoneCo.Id, IsPublished = true, CreatedDate = now.AddDays(-95), UpdatedDate = now.AddDays(-95),
                Name = "Yorkstone Paving Flag",
                Description = "Riven-face Yorkstone paving in 50mm thickness. Available in random and calibrated sizes. Suitable for public realm, courtyards, and heritage settings. Frost resistant.",
                Category = "Paving", Material = "Yorkstone Sandstone", DeclaredUnit = "per m²",
                FireRating = "A1", ThermalPerformance = "λ = 1.70 W/mK",
                Certifications = "CE marked, EN 1341, BRE verified",
                GwpA1A3 = 38.0m, GwpB4 = 38.0m, GwpC3 = 2.2m, GwpC4 = 4.8m },
            new() { ManufacturerId = stoneCo.Id, IsPublished = true, CreatedDate = now.AddDays(-70), UpdatedDate = now.AddDays(-70),
                Name = "Cotswold Limestone Wall Coping",
                Description = "Saddleback and flat Cotswold limestone copings in standard or cut-to-length sections. Natural colour variation. Suitable for parapets, boundary walls, and garden walls.",
                Category = "Masonry", Material = "Cotswold Limestone", DeclaredUnit = "per m",
                FireRating = "A1", Certifications = "CE marked, EN 771-6",
                GwpA1A3 = 24.0m, GwpC3 = 1.5m, GwpC4 = 3.2m },
            new() { ManufacturerId = stoneCo.Id, IsPublished = true, CreatedDate = now.AddDays(-25), UpdatedDate = now.AddDays(-25),
                Name = "Granite Sett Paving",
                Description = "Flamed and sawn granite setts in 100×100mm and 100×200mm formats. Grey, silver, and red granite varieties. Suitable for driveways, public squares, and heritage areas.",
                Category = "Paving", Material = "Granite", DeclaredUnit = "per m²",
                FireRating = "A1", ThermalPerformance = "λ = 3.49 W/mK",
                Certifications = "CE marked, EN 1342, BRE verified",
                GwpA1A3 = 42.0m, GwpC3 = 2.8m, GwpC4 = 5.5m },
        };

        db.Products.AddRange(products);
        db.SaveChanges();

        // ── Seed elements (architect's element library) ────────
        // Helper: look up product by name
        Platform.Api.Models.Product Prod(string name) => products.First(p => p.Name == name);

        var elements = new List<Platform.Api.Models.Element>
        {
            // ── 2. Primære bygningsdele ─────────────────────────
            new() {
                Name = "Timber Frame External Wall",
                Description = "Loadbearing timber stud wall with larch rainscreen and CLT structural sheathing.",
                Bim7aaCategory = 2, Bim7aaSubcategory = "2.1", ArchitectId = architect.Id, CreatedDate = now.AddDays(-20),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Cross-Laminated Timber (CLT) Panel") },
                    new() { Product = Prod("Siberian Larch Cladding") },
                }
            },
            new() {
                Name = "Precast Concrete Spandrel Facade",
                Description = "Non-loadbearing precast spandrel panels fixed to structural frame.",
                Bim7aaCategory = 2, Bim7aaSubcategory = "2.1", ArchitectId = architect.Id, CreatedDate = now.AddDays(-18),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Architectural Precast Facade Panel") },
                }
            },
            new() {
                Name = "Curtain Wall System",
                Description = "Unitised aluminium curtain wall. Suitable for commercial facades.",
                Bim7aaCategory = 2, Bim7aaSubcategory = "2.1", ArchitectId = architect.Id, CreatedDate = now.AddDays(-15),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Thermally Broken Curtain Wall System") },
                    new() { Product = Prod("Aluminium Tilt & Turn Window") },
                }
            },
            new() {
                Name = "Fibre Cement Rainscreen Facade",
                Description = "Large-format fibre cement panels on open-joint aluminium subframe.",
                Bim7aaCategory = 2, Bim7aaSubcategory = "2.1", ArchitectId = architect.Id, CreatedDate = now.AddDays(-14),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Fibre Cement Rainscreen Panel") },
                    new() { Product = Prod("Ventilated Facade Subframe System") },
                }
            },
            new() {
                Name = "CLT Floor Slab with Screed",
                Description = "Exposed CLT slab with polished concrete screed topping.",
                Bim7aaCategory = 2, Bim7aaSubcategory = "2.3", ArchitectId = architect.Id, CreatedDate = now.AddDays(-10),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Cross-Laminated Timber (CLT) Panel") },
                    new() { Product = Prod("Polished Concrete Floor Screed") },
                }
            },
            new() {
                Name = "Limestone Ashlar Wall",
                Description = "Loadbearing Portland limestone ashlar with lime mortar joints. For heritage and high-spec residential.",
                Bim7aaCategory = 2, Bim7aaSubcategory = "2.2", ArchitectId = architect.Id, CreatedDate = now.AddDays(-9),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Portland Limestone — Bed Ashlar") },
                }
            },

            // ── 3. Kompletterende bygningsdele ──────────────────
            new() {
                Name = "Glulam + Glass Screen",
                Description = "Slender glulam posts with structural glass infill. Suitable for internal courtyards and atriums.",
                Bim7aaCategory = 3, Bim7aaSubcategory = "3.1", ArchitectId = architect.Id, CreatedDate = now.AddDays(-8),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Glulam Beam — GL28h") },
                    new() { Product = Prod("Structural Glass Balustrade") },
                }
            },
            new() {
                Name = "Zinc Cassette Rainscreen",
                Description = "Pre-weathered zinc cassette on ventilated subframe for commercial facades.",
                Bim7aaCategory = 3, Bim7aaSubcategory = "3.2", ArchitectId = architect.Id, CreatedDate = now.AddDays(-7),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Zinc Cassette Panel") },
                    new() { Product = Prod("Ventilated Facade Subframe System") },
                }
            },

            // ── 4. Overfladebygningsdele ────────────────────────
            new() {
                Name = "Polished Concrete Floor Finish",
                Description = "Power-floated and sealed concrete screed. Suitable for underfloor heating.",
                Bim7aaCategory = 4, Bim7aaSubcategory = "4.1", ArchitectId = architect.Id, CreatedDate = now.AddDays(-6),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Polished Concrete Floor Screed") },
                }
            },
            new() {
                Name = "Micro-Cement Feature Wall",
                Description = "2mm micro-cement, seamless waterproof finish for bathrooms and feature walls.",
                Bim7aaCategory = 4, Bim7aaSubcategory = "4.2", ArchitectId = architect.Id, CreatedDate = now.AddDays(-5),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Micro-Cement Wall Coating") },
                }
            },
            new() {
                Name = "Engineered Oak Flooring on Screed",
                Description = "Floating engineered oak over polished concrete base. Suitable for residential and boutique commercial.",
                Bim7aaCategory = 4, Bim7aaSubcategory = "4.1", ArchitectId = architect.Id, CreatedDate = now.AddDays(-4),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Engineered Oak Flooring") },
                    new() { Product = Prod("Polished Concrete Floor Screed") },
                }
            },

            // ── 8. Beplantning og belægning ─────────────────────
            new() {
                Name = "Yorkstone Courtyard Paving",
                Description = "Yorkstone flags on mortar bed with sand joints. Pedestrian and light vehicle.",
                Bim7aaCategory = 8, Bim7aaSubcategory = "8.2", ArchitectId = architect.Id, CreatedDate = now.AddDays(-3),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Yorkstone Paving Flag") },
                }
            },
            new() {
                Name = "Granite Sett Road Surface",
                Description = "Reclaimed granite setts on compacted sub-base. Suitable for shared surfaces and historic streetscapes.",
                Bim7aaCategory = 8, Bim7aaSubcategory = "8.2", ArchitectId = architect.Id, CreatedDate = now.AddDays(-2),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Granite Sett Paving") },
                }
            },
            new() {
                Name = "Hardwood Decking on Podium",
                Description = "Thermally modified ash deck boards on adjustable pedestal system over waterproofing.",
                Bim7aaCategory = 8, Bim7aaSubcategory = "8.2", ArchitectId = architect.Id, CreatedDate = now.AddDays(-1),
                ElementProducts = new List<Platform.Api.Models.ElementProduct> {
                    new() { Product = Prod("Thermally Modified Ash Decking") },
                }
            },
        };

        db.Elements.AddRange(elements);
        db.SaveChanges();
        startupLog.LogInformation("Demo data seeded ({ProductCount} products, {ElementCount} elements).",
            products.Count, elements.Count);
    }
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseRateLimiter();
app.UseCors("ReactApp");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run("http://localhost:5000");
