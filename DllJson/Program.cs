/*
  Author: Saideep Bhange
 */

using DllJson.Models;
using DllJson.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace DllJson
{
    public class Program
    {
        static void Main(string[] args)
        {
            var config = new FoldersJson();

            Console.WriteLine("Scanning configurations...");

            foreach (var folderConfig in config.Configurations)
            {
                try
                {
                    Directory.CreateDirectory(
                        folderConfig.OutputPath);

                    Console.WriteLine(
                        $"Processing: {folderConfig.JsonFileName}");

                    var scanner = new AssemblyScanner();

                    var graph = scanner.Scan(folderConfig);

                    //
                    // Create Dlls folder
                    //
                    var dllFolder = Path.Combine(
                        folderConfig.OutputPath,
                        "Dlls");

                    Directory.CreateDirectory(dllFolder);

                    //
                    // Save one file per DLL
                    //
                    foreach (var dll in graph.Dlls)
                    {
                        var dllFileName =
                            MakeSafeFileName(dll.DllName) + ".json";

                        var dllPath = Path.Combine(
                            dllFolder,
                            dllFileName);

                        var dllJson = JsonSerializer.Serialize(
                            dll,
                            new JsonSerializerOptions
                            {
                                WriteIndented = true
                            });

                        File.WriteAllText(
                            dllPath,
                            dllJson);
                    }

                    //
                    // Build lightweight graph
                    //
                    var lightGraph = new AssemblyGraph
                    {
                        References = graph.References,
                        TypeReferences = graph.TypeReferences,
                        Dlls = graph.Dlls
                            .Select(d => new DllInfo
                            {
                                Id = d.Id,
                                DllName = d.DllName,
                                Version = d.Version,
                                FilePath = d.FilePath,
                                Metadata = d.Metadata,
                                Dependencies = d.Dependencies
                            })
                            .ToList()
                    };

                    //
                    // Save master graph
                    //
                    var graphPath = Path.Combine(
                        folderConfig.OutputPath,
                        folderConfig.JsonFileName);

                    var graphJson = JsonSerializer.Serialize(
                        lightGraph,
                        new JsonSerializerOptions
                        {
                            WriteIndented = true
                        });

                    File.WriteAllText(
                        graphPath,
                        graphJson);

                    Console.WriteLine(
                        $"Master Graph Saved: {graphPath}");

                    Console.WriteLine(
                        $"DLL Count: {graph.Dlls.Count}");

                    Console.WriteLine(
                        $"Reference Count: {graph.References.Count}");

                    Console.WriteLine(
                        $"DLL Files Saved: {graph.Dlls.Count}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                        $"ERROR: {ex.Message}");
                }
            }

            Console.WriteLine("ALL DONE");
        }

        private static string MakeSafeFileName(
            string fileName)
        {
            foreach (var invalidChar in Path.GetInvalidFileNameChars())
            {
                fileName =
                    fileName.Replace(
                        invalidChar,
                        '_');
            }

            return fileName;
        }
    }
}