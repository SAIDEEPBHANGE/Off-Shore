using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DllJson.Models
{
    public class FoldersJson
    {
        public List<FolderJson> Configurations { get; set; }
        public FoldersJson()
        {
            Configurations = new List<FolderJson>
            {
                new FolderJson
                {
                    JsonFileName = "SmartPlantPID.json",
                    FolderPath = "D:\\Off-Share\\P&ID Workstation\\bin",
                    OutputPath = "D:\\Github Repository\\Off-Shore\\Dll-Structure\\SmartPlantPID"
                },
                new FolderJson
                {
                    JsonFileName = "SmartPlant3D.json",
                    FolderPath = "D:\\Off-Share\\Smart3D",
                    OutputPath = "D:\\Github Repository\\Off-Shore\\Dll-Structure\\SmartPlant3D"
                }
            };

        }
    }
}
