using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Entities.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePasswordLengthInDbContext : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "password",
                table: "Users",
                type: "nchar(255)",
                fixedLength: true,
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nchar(15)",
                oldFixedLength: true,
                oldMaxLength: 15);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "password",
                table: "Users",
                type: "nchar(15)",
                fixedLength: true,
                maxLength: 15,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nchar(255)",
                oldFixedLength: true,
                oldMaxLength: 255);
        }
    }
}
