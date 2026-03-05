using System;
using System.ComponentModel.DataAnnotations;

namespace Platform.Api.DTOs
{
    public class ProductRequest
    {
        [Required][StringLength(200)]
        public string Name { get; set; }

        [StringLength(2000)]
        public string Description { get; set; }

        [Required][StringLength(100)]
        public string Category { get; set; }

        [Required][StringLength(200)]
        public string Material { get; set; }

        [StringLength(50)]
        public string? DeclaredUnit { get; set; }

        // Fire
        [StringLength(50)]
        public string? FireRating { get; set; }

        [StringLength(50)]
        public string? FireResistance { get; set; }

        // Physical
        public decimal? WeightPerUnit { get; set; }
        public decimal? Thickness { get; set; }
        public decimal? Width { get; set; }
        public decimal? Height { get; set; }
        public decimal? Length { get; set; }

        // Thermal
        [StringLength(200)]
        public string? ThermalPerformance { get; set; }

        // Sound
        public int? SoundReductionRw { get; set; }
        public int? SoundReductionRwCCtr { get; set; }
        public decimal? SoundAbsorptionAlphaW { get; set; }

        // Certifications
        [StringLength(200)]
        public string? AcousticRating { get; set; }

        [StringLength(500)]
        public string? Certifications { get; set; }

        // EPD
        [StringLength(500)]
        public string? EpdUrl { get; set; }

        public decimal? GwpA1A3 { get; set; }
        public decimal? GwpB4 { get; set; }
        public decimal? GwpB6 { get; set; }
        public decimal? GwpC3 { get; set; }
        public decimal? GwpC4 { get; set; }

        // Documents
        [StringLength(500)]
        public string? DatasheetUrl { get; set; }

        [StringLength(500)]
        public string? BimUrl { get; set; }

        [StringLength(500)]
        public string? InstallationGuideUrl { get; set; }

        [StringLength(500)]
        public string? FireCertificateUrl { get; set; }

        [StringLength(500)]
        public string? SoundTestReportUrl { get; set; }

        [StringLength(500)]
        public string? CeDeclarationUrl { get; set; }

        public bool IsPublished { get; set; }
    }

    public class ProductResponse
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public string Material { get; set; }
        public string? DeclaredUnit { get; set; }
        // Fire
        public string? FireRating { get; set; }
        public string? FireResistance { get; set; }
        // Physical
        public decimal? WeightPerUnit { get; set; }
        public decimal? Thickness { get; set; }
        public decimal? Width { get; set; }
        public decimal? Height { get; set; }
        public decimal? Length { get; set; }
        // Thermal
        public string? ThermalPerformance { get; set; }
        // Sound
        public int? SoundReductionRw { get; set; }
        public int? SoundReductionRwCCtr { get; set; }
        public decimal? SoundAbsorptionAlphaW { get; set; }
        // Certifications
        public string? AcousticRating { get; set; }
        public string? Certifications { get; set; }
        // EPD
        public string? EpdUrl { get; set; }
        public decimal? GwpA1A3 { get; set; }
        public decimal? GwpB4 { get; set; }
        public decimal? GwpB6 { get; set; }
        public decimal? GwpC3 { get; set; }
        public decimal? GwpC4 { get; set; }
        // Documents
        public string? DatasheetUrl { get; set; }
        public string? BimUrl { get; set; }
        public string? InstallationGuideUrl { get; set; }
        public string? FireCertificateUrl { get; set; }
        public string? SoundTestReportUrl { get; set; }
        public string? CeDeclarationUrl { get; set; }
        public bool IsPublished { get; set; }
        public int ManufacturerId { get; set; }
        public string ManufacturerName { get; set; }
        public DateTime CreatedDate { get; set; }
    }
}