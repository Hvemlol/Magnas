using System;

namespace Platform.Api.Models
{
    public class ProjectProduct
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public Project Project { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }
        public int? GroupId { get; set; }
        public ProjectGroup? Group { get; set; }
        public int? AddedByUserId { get; set; }
        public User? AddedBy { get; set; }
        public string? Notes { get; set; }
        public DateTime AddedDate { get; set; }
    }
}
