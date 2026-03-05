using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Platform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddElementFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SavedProducts_ArchitectId",
                table: "SavedProducts");

            migrationBuilder.AddColumn<string>(
                name: "BuildingComponents",
                table: "Elements",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuildingPartAnalysis",
                table: "Elements",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Entreprise",
                table: "Elements",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FireClass",
                table: "Elements",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Responsibility",
                table: "Elements",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SelfWeight",
                table: "Elements",
                type: "decimal(10,3)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SoundRequirement",
                table: "Elements",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Elements",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TypeNumber",
                table: "Elements",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UValue",
                table: "Elements",
                type: "decimal(10,4)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Unit",
                table: "Elements",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "Elements",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Work",
                table: "Elements",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkDescriptionNumber",
                table: "Elements",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavedProducts_ArchitectId_ProductId",
                table: "SavedProducts",
                columns: new[] { "ArchitectId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_IsPublished",
                table: "Products",
                column: "IsPublished");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_SavedProducts_ArchitectId_ProductId",
                table: "SavedProducts");

            migrationBuilder.DropIndex(
                name: "IX_Products_IsPublished",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "BuildingComponents",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "BuildingPartAnalysis",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "Entreprise",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "FireClass",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "Responsibility",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "SelfWeight",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "SoundRequirement",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "TypeNumber",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "UValue",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "Work",
                table: "Elements");

            migrationBuilder.DropColumn(
                name: "WorkDescriptionNumber",
                table: "Elements");

            migrationBuilder.CreateIndex(
                name: "IX_SavedProducts_ArchitectId",
                table: "SavedProducts",
                column: "ArchitectId");
        }
    }
}
