// Extends the implicit top-level Program class to make it public
// so WebApplicationFactory<Program> in integration tests can find the entry assembly.
public partial class Program { }
