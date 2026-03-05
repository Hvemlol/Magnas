namespace Platform.Api.Models;

public class ElementProduct
{
    public int Id { get; set; }
    public int ElementId { get; set; }
    public Element Element { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; }
    public string? Notes { get; set; }
}
