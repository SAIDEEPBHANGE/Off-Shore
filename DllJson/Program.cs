/*
  Author: Saideep Bhange
 */

using DllJson.Models;
using DllJson.Services;
using System;
using System.IO;
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

                    var outputFile = Path.Combine(
                        folderConfig.OutputPath,
                        folderConfig.JsonFileName);

                    var json = JsonSerializer.Serialize(
                        graph,
                        new JsonSerializerOptions
                        {
                            WriteIndented = true
                        });

                    File.WriteAllText(
                        outputFile,
                        json);

                    Console.WriteLine(
                        $"Saved: {outputFile}");

                    Console.WriteLine(
                        $"DLL Count: {graph.Dlls.Count}");

                    Console.WriteLine(
                        $"Reference Count: {graph.References.Count}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                        $"ERROR: {ex.Message}");
                }
            }

            Console.WriteLine("ALL DONE");
        }
    }
}