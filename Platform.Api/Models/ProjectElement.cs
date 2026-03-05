namespace Platform.Api.Models;

public class ProjectElement
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; }
    public int ElementId { get; set; }
    public Element Element { get; set; }
    public int? GroupId { get; set; }
    public ProjectGroup? Group { get; set; }
    public int? AddedByUserId { get; set; }
    public User? AddedBy { get; set; }
    public string? Notes { get; set; }
    public DateTime AddedDate { get; set; }
}
