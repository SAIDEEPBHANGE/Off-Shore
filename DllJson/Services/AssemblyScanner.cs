using DllJson.Models;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;

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

        public AssemblyGraph Scan(FolderJson config)
        {
            var graph = new AssemblyGraph();

            Console.WriteLine($"Scanning: {config.FolderPath}");

            var assemblies = LoadAssemblies(config.FolderPath);

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

            return graph;
        }

        private Dictionary<string, AssemblyDefinition> LoadAssemblies(
            string rootFolder)
        {
            var result =
                new Dictionary<string, AssemblyDefinition>(
                    StringComparer.OrdinalIgnoreCase);

            var dllFiles = Directory.GetFiles(
                rootFolder,
                "*.dll",
                SearchOption.AllDirectories);

            Console.WriteLine($"DLLs Found: {dllFiles.Length}");

            foreach (var file in dllFiles)
            {
                if (!IsDotNetAssembly(file))
                    continue;

                try
                {
                    var assembly =
                        AssemblyDefinition.ReadAssembly(file);

                    result[file] = assembly;
                }
                catch
                {
                    // Ignore invalid DLL
                }
            }

            return result;
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
                AssemblyName.GetAssemblyName(file);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}