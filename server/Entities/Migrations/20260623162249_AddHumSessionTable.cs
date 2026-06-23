using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Entities.Migrations
{
    /// <inheritdoc />
    public partial class AddHumSessionTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "password",
                table: "Users",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nchar(255)",
                oldFixedLength: true,
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "email_address",
                table: "Users",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nchar(30)",
                oldFixedLength: true,
                oldMaxLength: 30,
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "HumSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "newsequentialid()"),
                    UserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AudioDurationSeconds = table.Column<double>(type: "float", nullable: false),
                    DetectedGenre = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ConfidenceScore = table.Column<double>(type: "float", nullable: false),
                    RawTranscription = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    RecommendedShowIds = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    SessionStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HumSessions", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HumSessions");

            migrationBuilder.AlterColumn<string>(
                name: "password",
                table: "Users",
                type: "nchar(255)",
                fixedLength: true,
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "email_address",
                table: "Users",
                type: "nchar(30)",
                fixedLength: true,
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);
        }
    }
}
