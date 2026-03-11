using System;
using System.IO;
using System.Reflection;
using System.Runtime.Serialization;
using System.Text;
using SiyeFlow.Core.Models;

namespace SiyeFlow.Core.TypeGen
{
    class Program
    {
        static void Main(string[] args)
        {
            var outputPath = args.Length > 0 ? args[0] : "../../siye-flow-designer/src/models/workflow-models.generated.ts";

            Console.WriteLine("Generating TypeScript enums from C# models...");

            var sb = new StringBuilder();

            sb.AppendLine("/**");
            sb.AppendLine(" * Auto-generated from SiyeFlow.Core.Models");
            sb.AppendLine($" * Generated: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            sb.AppendLine(" * DO NOT EDIT - run SiyeFlow.Core.TypeGen to regenerate");
            sb.AppendLine(" */");
            sb.AppendLine();

            GenerateEnum<BlockType>(sb, "BlockType");
            GenerateEnum<EdgeType>(sb, "EdgeType");

            var fullPath = Path.GetFullPath(outputPath);
            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllText(fullPath, sb.ToString());
            Console.WriteLine($"Generated: {fullPath}");
        }

        static void GenerateEnum<T>(StringBuilder sb, string name) where T : struct, Enum
        {
            sb.AppendLine($"export enum {name} {{");
            foreach (var value in Enum.GetValues<T>())
            {
                var memberInfo = typeof(T).GetField(value.ToString()!);
                var attr = memberInfo?.GetCustomAttribute<EnumMemberAttribute>();
                var serialized = attr?.Value ?? ToKebabCase(value.ToString()!);
                sb.AppendLine($"    {value} = '{serialized}',");
            }
            sb.AppendLine("}");
            sb.AppendLine();
        }

        static string ToKebabCase(string str)
        {
            if (string.IsNullOrEmpty(str)) return str;
            var result = new StringBuilder();
            for (int i = 0; i < str.Length; i++)
            {
                if (char.IsUpper(str[i]) && i > 0)
                    result.Append('-');
                result.Append(char.ToLowerInvariant(str[i]));
            }
            return result.ToString();
        }
    }
}
