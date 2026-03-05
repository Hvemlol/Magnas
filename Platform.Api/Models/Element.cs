namespace Platform.Api.Models;

public class Element
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
    public int Bim7aaCategory { get; set; }
    public string? Bim7aaSubcategory { get; set; }
    public int ArchitectId { get; set; }
    public User Architect { get; set; }
    public DateTime CreatedDate { get; set; }

    // Extended fields
    public string? TypeNumber { get; set; }
    public string? BuildingComponents { get; set; }
    public int? Status { get; set; }
    public string? Entreprise { get; set; }
    public string? WorkDescriptionNumber { get; set; }
    public string? Work { get; set; }
    public string? Responsibility { get; set; }
    public string? SoundRequirement { get; set; }
    public decimal? UValue { get; set; }
    public string? FireClass { get; set; }
    public decimal? SelfWeight { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? Unit { get; set; }
    public string? BuildingPartAnalysis { get; set; }

    public ICollection<ElementProduct> ElementProducts { get; set; } = new List<ElementProduct>();
    public ICollection<ProjectElement> ProjectElements { get; set; } = new List<ProjectElement>();
}
