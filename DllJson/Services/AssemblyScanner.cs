using DllJson.Models;
using Mono.Cecil;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;

namespace DllJson.Services
{
    public class AssemblyScanner
    {
        private readonly TypeExtractor _typeExtractor;
        private readonly ReferenceBuilder _referenceBuilder;

        public AssemblyScanner()
        {
            _typeExtractor = new TypeExtractor();
            _referenceBuilder = new ReferenceBuilder();
        }

        public ScanResult Scan(FolderJson config)
        {
            var graph = new AssemblyGraph();

            Console.WriteLine($"Scanning: {config.FolderPath}");

            var loadResult = LoadAssemblies(config.FolderPath);

            var assemblies = loadResult.Loaded;

            var dllLookup =
                new Dictionary<string, DllInfo>(
                    StringComparer.OrdinalIgnoreCase);

            //
            // Build DllInfo
            //
            foreach (var item in assemblies)
            {
                var filePath = item.Key;
                var assembly = item.Value;

                var dllInfo = CreateDllInfo(
                    assembly,
                    filePath);

                graph.Dlls.Add(dllInfo);

                dllLookup[assembly.Name.Name] = dllInfo;
            }

            //
            // Extract Types
            //
            foreach (var item in assemblies)
            {
                var assembly = item.Value;

                if (dllLookup.TryGetValue(
                    assembly.Name.Name,
                    out var dllInfo))
                {
                    _typeExtractor.ExtractTypes(
                        assembly,
                        dllInfo);
                }
            }

            //
            // Build References
            //
            _referenceBuilder.BuildDllReferences(
                graph,
                assemblies,
                dllLookup);

            return new ScanResult
            {
                Graph = graph,
                Skipped = loadResult.Skipped
            };
        }

        private LoadResult LoadAssemblies(
            string rootFolder)
        {
            var loaded = new ConcurrentDictionary<string, AssemblyDefinition>(StringComparer.OrdinalIgnoreCase);
            var skipped = new ConcurrentBag<SkippedAssemblyInfo>();

            var dllFiles = Directory.GetFiles(
                rootFolder,
                "*.dll",
                SearchOption.AllDirectories);

            Console.WriteLine($"DLLs Found: {dllFiles.Length}");

            var maxDegree = Math.Max(1, Environment.ProcessorCount - 1);

            Parallel.ForEach(dllFiles, new ParallelOptions { MaxDegreeOfParallelism = maxDegree }, file =>
            {
                try
                {
                    if (!IsDotNetAssembly(file))
                    {
                        skipped.Add(new SkippedAssemblyInfo
                        {
                            FilePath = file,
                            Reason = "Not a .NET assembly"
                        });
                        return;
                    }

                    var assembly = AssemblyDefinition.ReadAssembly(file);
                    loaded[file] = assembly;
                }
                catch (Exception ex)
                {
                    // record skipped/failed assemblies with reason
                    skipped.Add(new SkippedAssemblyInfo
                    {
                        FilePath = file,
                        Reason = ex.Message,
                        Exception = new DllJson.Models.ExceptionInfo
                        {
                            Type = ex.GetType().FullName,
                            Message = ex.Message,
                            StackTrace = ex.StackTrace
                        }
                    });
                }
            });

            return new LoadResult
            {
                Loaded = new Dictionary<string, AssemblyDefinition>(loaded, StringComparer.OrdinalIgnoreCase),
                Skipped = new List<SkippedAssemblyInfo>(skipped)
            };
        }

        private DllInfo CreateDllInfo(
            AssemblyDefinition assembly,
            string filePath)
        {
            var dllInfo = new DllInfo
            {
                DllName = assembly.Name.Name,
                Version = assembly.Name.Version?.ToString(),
                FilePath = filePath,
                Metadata = new Metadata
                {
                    AssemblyName = assembly.Name.Name,
                    RuntimeVersion = assembly.MainModule.RuntimeVersion,
                    ScanDate = DateTime.UtcNow
                }
            };

            foreach (var reference in assembly.MainModule.AssemblyReferences)
            {
                dllInfo.Dependencies.Add(
                    new Dependencies
                    {
                        AssemblyName = reference.Name,
                        Version = reference.Version?.ToString()
                    });
            }

            return dllInfo;
        }

        private bool IsDotNetAssembly(string file)
        {
            try
            {
                // Quick check - will throw for native or invalid PE files
                AssemblyName.GetAssemblyName(file);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    public class LoadResult
    {
        public Dictionary<string, AssemblyDefinition> Loaded { get; set; } = new Dictionary<string, AssemblyDefinition>(StringComparer.OrdinalIgnoreCase);
        public List<SkippedAssemblyInfo> Skipped { get; set; } = new List<SkippedAssemblyInfo>();
    }

    public class SkippedAssemblyInfo
    {
        public string FilePath { get; set; }
        public string Reason { get; set; }
        public DllJson.Models.ExceptionInfo Exception { get; set; }
    }

    public class ScanResult
    {
        public AssemblyGraph Graph { get; set; }
        public List<SkippedAssemblyInfo> Skipped { get; set; } = new List<SkippedAssemblyInfo>();
    }
}