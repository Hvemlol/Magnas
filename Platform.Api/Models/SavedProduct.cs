namespace Platform.Api.Models
{
    public class SavedProduct
    {
        public int Id { get; set; }
        public int ArchitectId { get; set; }
        public User Architect { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }
    }
}
