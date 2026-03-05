using System;
using System.Collections.Generic;

namespace Platform.Api.Models
{
    public class Project
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public string? Location { get; set; }
        public int ArchitectId { get; set; }
        public User Architect { get; set; }
        public DateTime CreatedDate { get; set; }
        public ICollection<ProjectGroup> Groups { get; set; } = new List<ProjectGroup>();
        public ICollection<ProjectProduct> ProjectProducts { get; set; } = new List<ProjectProduct>();
        public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
    }
}
