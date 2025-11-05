using Microsoft.OpenApi.Models;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Interfaces
{
    /// <summary>
    /// Interface for loading and parsing OpenAPI definitions
    /// </summary>
    public interface IApiDefinitionLoader
    {
        /// <summary>
        /// Loads an OpenAPI document from a file path
        /// </summary>
        Task<OpenApiDocument> LoadAsync(string filePath);

        /// <summary>
        /// Validates the loaded OpenAPI document
        /// </summary>
        bool Validate(OpenApiDocument document, out List<string> errors);
    }
}
