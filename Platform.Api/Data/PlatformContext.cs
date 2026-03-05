using Microsoft.EntityFrameworkCore;
using Platform.Api.Models;

namespace Platform.Api.Data
{
    public class PlatformContext : DbContext
    {
        public PlatformContext(DbContextOptions<PlatformContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<SavedProduct> SavedProducts { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<ProjectGroup> ProjectGroups { get; set; }
        public DbSet<ProjectProduct> ProjectProducts { get; set; }
        public DbSet<Element> Elements { get; set; }
        public DbSet<ElementProduct> ElementProducts { get; set; }
        public DbSet<ProjectElement> ProjectElements { get; set; }
        public DbSet<ProjectMember> ProjectMembers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // ── Relationships ─────────────────────────────────────────────────

            modelBuilder.Entity<Product>()
                .HasOne(p => p.Manufacturer)
                .WithMany()
                .HasForeignKey(p => p.ManufacturerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SavedProduct>()
                .HasOne(s => s.Architect)
                .WithMany()
                .HasForeignKey(s => s.ArchitectId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SavedProduct>()
                .HasOne(s => s.Product)
                .WithMany()
                .HasForeignKey(s => s.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Product>().Property(p => p.GwpA1A3).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<Product>().Property(p => p.GwpB4).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<Product>().Property(p => p.GwpB6).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<Product>().Property(p => p.GwpC3).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<Product>().Property(p => p.GwpC4).HasColumnType("decimal(18,4)");

            modelBuilder.Entity<Element>().Property(e => e.UValue).HasColumnType("decimal(10,4)");
            modelBuilder.Entity<Element>().Property(e => e.SelfWeight).HasColumnType("decimal(10,3)");
            modelBuilder.Entity<Element>().Property(e => e.UnitPrice).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Project>()
                .HasOne(p => p.Architect)
                .WithMany()
                .HasForeignKey(p => p.ArchitectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectGroup>()
                .HasOne(g => g.Project)
                .WithMany(p => p.Groups)
                .HasForeignKey(g => g.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectProduct>()
                .HasOne(pp => pp.Project)
                .WithMany(p => p.ProjectProducts)
                .HasForeignKey(pp => pp.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectProduct>()
                .HasOne(pp => pp.Product)
                .WithMany()
                .HasForeignKey(pp => pp.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectProduct>()
                .HasOne(pp => pp.Group)
                .WithMany()
                .HasForeignKey(pp => pp.GroupId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ProjectProduct>()
                .HasOne(pp => pp.AddedBy)
                .WithMany()
                .HasForeignKey(pp => pp.AddedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Element>()
                .HasOne(e => e.Architect)
                .WithMany()
                .HasForeignKey(e => e.ArchitectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ElementProduct>()
                .HasOne(ep => ep.Element)
                .WithMany(e => e.ElementProducts)
                .HasForeignKey(ep => ep.ElementId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ElementProduct>()
                .HasOne(ep => ep.Product)
                .WithMany()
                .HasForeignKey(ep => ep.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectElement>()
                .HasOne(pe => pe.Project)
                .WithMany()
                .HasForeignKey(pe => pe.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectElement>()
                .HasOne(pe => pe.Element)
                .WithMany(e => e.ProjectElements)
                .HasForeignKey(pe => pe.ElementId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectElement>()
                .HasOne(pe => pe.Group)
                .WithMany()
                .HasForeignKey(pe => pe.GroupId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ProjectElement>()
                .HasOne(pe => pe.AddedBy)
                .WithMany()
                .HasForeignKey(pe => pe.AddedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ProjectMember>(b =>
            {
                b.HasIndex(m => new { m.ProjectId, m.UserId }).IsUnique();
                b.HasIndex(m => m.UserId);
                b.HasOne(m => m.Project)
                    .WithMany(p => p.Members)
                    .HasForeignKey(m => m.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);
                b.HasOne(m => m.User)
                    .WithMany()
                    .HasForeignKey(m => m.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                b.HasOne(m => m.InvitedBy)
                    .WithMany()
                    .HasForeignKey(m => m.InvitedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ── Indexes ───────────────────────────────────────────────────────

            // Users: unique email for login lookup and duplicate prevention
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Products: owner filter (GET /products/mine) + publish filter
            modelBuilder.Entity<Product>()
                .HasIndex(p => p.ManufacturerId);
            modelBuilder.Entity<Product>()
                .HasIndex(p => p.IsPublished);

            // SavedProducts: owner filter (GET /saved) + unique save per architect
            modelBuilder.Entity<SavedProduct>()
                .HasIndex(s => new { s.ArchitectId, s.ProductId })
                .IsUnique();

            // Projects: owner filter (GET /projects)
            modelBuilder.Entity<Project>()
                .HasIndex(p => p.ArchitectId);

            // ProjectGroups: FK lookup for cascade deletes and project includes
            modelBuilder.Entity<ProjectGroup>()
                .HasIndex(g => g.ProjectId);

            // ProjectProducts: FK lookups for project includes and cascade deletes
            modelBuilder.Entity<ProjectProduct>()
                .HasIndex(pp => pp.ProjectId);
            modelBuilder.Entity<ProjectProduct>()
                .HasIndex(pp => pp.ProductId);
            modelBuilder.Entity<ProjectProduct>()
                .HasIndex(pp => pp.GroupId);

            // Elements: owner filter (GET /elements)
            modelBuilder.Entity<Element>()
                .HasIndex(e => e.ArchitectId);

            // ElementProducts: FK lookups for element includes and cascade deletes
            modelBuilder.Entity<ElementProduct>()
                .HasIndex(ep => ep.ElementId);
            modelBuilder.Entity<ElementProduct>()
                .HasIndex(ep => ep.ProductId);

            // ProjectElements: FK lookups for project includes and cascade deletes
            modelBuilder.Entity<ProjectElement>()
                .HasIndex(pe => pe.ProjectId);
            modelBuilder.Entity<ProjectElement>()
                .HasIndex(pe => pe.ElementId);
            modelBuilder.Entity<ProjectElement>()
                .HasIndex(pe => pe.GroupId);
        }
    }
}
