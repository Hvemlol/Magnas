using System;

namespace Platform.Api.Models
{
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public string Material { get; set; }
        public string? DeclaredUnit { get; set; }       // e.g. "per m²", "per kg", "per unit"

        // Technical specifications — fire
        public string? FireRating { get; set; }          // Euroclass e.g. "A2-s1,d0"
        public string? FireResistance { get; set; }      // Structural resistance e.g. "REI 60", "EI 30"

        // Technical specifications — physical
        public decimal? WeightPerUnit { get; set; }      // kg per declared unit
        public decimal? Thickness { get; set; }          // mm
        public decimal? Width { get; set; }              // mm
        public decimal? Height { get; set; }             // mm
        public decimal? Length { get; set; }             // mm

        // Technical specifications — thermal
        public string? ThermalPerformance { get; set; }  // e.g. "λ = 0.035 W/mK"

        // Technical specifications — sound
        public int? SoundReductionRw { get; set; }          // dB — weighted sound reduction index
        public int? SoundReductionRwCCtr { get; set; }      // dB — C and Ctr correction (traffic noise)
        public decimal? SoundAbsorptionAlphaW { get; set; } // αw 0.00–1.00

        // Certifications
        public string? AcousticRating { get; set; }      // free-text legacy field e.g. "Rw 52 dB"
        public string? Certifications { get; set; }      // e.g. "CE marked, BBA, UKCA"

        // EPD (Environmental Product Declaration) — EN 15804 lifecycle stages
        public string? EpdUrl { get; set; }
        public decimal? GwpA1A3 { get; set; }  // Product stage (extraction + transport + manufacturing)
        public decimal? GwpB4 { get; set; }    // Replacement (during use phase)
        public decimal? GwpB6 { get; set; }    // Operational energy use
        public decimal? GwpC3 { get; set; }    // Waste processing (end of life)
        public decimal? GwpC4 { get; set; }    // Disposal (end of life)

        // Document links
        public string? DatasheetUrl { get; set; }
        public string? BimUrl { get; set; }
        public string? InstallationGuideUrl { get; set; }
        public string? FireCertificateUrl { get; set; }
        public string? SoundTestReportUrl { get; set; }
        public string? CeDeclarationUrl { get; set; }

        public int ManufacturerId { get; set; }
        public User Manufacturer { get; set; }
        public bool IsPublished { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime UpdatedDate { get; set; }
    }
}
