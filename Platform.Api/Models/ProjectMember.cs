using System;

namespace Platform.Api.Models
{
    public enum MemberStatus { Pending = 0, Accepted = 1 }

    public class ProjectMember
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public int InvitedByUserId { get; set; }
        public User InvitedBy { get; set; } = null!;
        public MemberStatus Status { get; set; } = MemberStatus.Pending;
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    }
}
