namespace Platform.Api.Models
{
    public class ProjectGroup
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int ProjectId { get; set; }
        public Project Project { get; set; }
        public int SortOrder { get; set; }
    }
}
