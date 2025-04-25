import React from "react";
import { PieChart, Pie, Cell, Tooltip, TooltipProps } from "recharts";

// Define skin tone categories with representative colors and recommended shades
const skinTones = [
  { name: "Fair Cool", color: "#F3D9D4", shades: ["#00C2AF", "#B8C9E1", "#5BC2E7", "#6787B7", "#57728B", "#3E6991", "#808286", "#CDB5A7", "#F57EB6", "#AD96DC", "#3A48BA", "#ECB3CB"] },
  { name: "Fair Warm", color: "#F6CBA6", shades: ["#6DCDB8", "#6CC24A", "#C4D600", "#FEEF00", "#FF8F1C", "#F69F23", "#FDD26E", "#FF2600", "#7421B0", "#3A48BA", "#00A499", "#2DCCD3"] },
  { name: "Light Cool", color: "#E6B8A2", shades: ["#C26E60", "#C05131", "#DB864E", "#CDA788", "#FAC712", "#FDAA63", "#F5E1A4", "#7C4D3A", "#946037", "#52463F", "#BBC592", "#507F70"] },
  { name: "Medium Cool", color: "#C48E78", shades: ["#71C5E8", "#06352E", "#00A376", "#FEEF00", "#FAC712", "#F69F23", "#FB6312", "#FF2600", "#93328E", "#7421B0", "#3A48BA", "#00649B"] },
  { name: "Deep Cool", color: "#8D5D4C", shades: ["#00C2AF", "#003057", "#57728B", "#6787B7", "#57728B", "#007681", "#006F62", "#BCBDBE", "#C4A4A7", "#BF0D3E", "#D2298E", "#7421B0"] },
  { name: "Medium Warm", color: "#B8764D", shades: ["#00C2AF", "#009775", "#99D6EA", "#808286", "#F8E59A", "#F395C7", "#E3006D", "#CE0037", "#D2298E", "#7421B0", "#3A48BA", "#006FC4"] },
  { name: "Deep Warm", color: "#6D3B2E", shades: ["#94FFF2", "#00B500", "#A9FF03", "#FFF278", "#F9B087", "#E54520", "#3A1700", "#FB6312", "#D2298E", "#6802C1", "#001ECC", "#006FC4"] },
  { name: "Light Neutral", color: "#D9A68D", shades: ["#00C2AF", "#009775", "#7FD200", "#F8E59A", "#FEFEFE", "#F395C7", "#FB6312", "#FF2600", "#D2298E", "#963CBD", "#3A48BA", "#0082BA"] },
  { name: "Medium Neutral", color: "#A46B52", shades: ["#6BCABA", "#00B500", "#7FD200", "#FEEF00", "#B4A91F", "#A07400", "#205C40", "#9D4815", "#946037", "#C4622D", "#F68D2E", "#00778B"] },
  { name: "Light Warm", color: "#E6B98F", shades: ["#00C2AF", "#00B500", "#7FD200", "#FEEF00", "#FAC712", "#FF8D6D", "#FF8200", "#FF2600", "#E40046", "#A77BCA", "#3A48BA", "#006FC4"] },
  { name: "Deep Neutral", color: "#714233", shades: ["#00C2AF", "#0E470E", "#9AEA0F", "#FEEF00", "#FFC200", "#F69F23", "#FF592C", "#FF2600", "#CE0037", "#7421B0", "#3A48BA", "#006FC4"] }
];

interface ColorWheelProps {
  selectedTone: string;
}

interface DataItem {
  name: string;
  value: number;
  color: string;
}

const ColorWheel: React.FC<ColorWheelProps> = ({ selectedTone }) => {
  const selectedSkinTone = skinTones.find((tone) => tone.name === selectedTone);
  
  if (!selectedSkinTone) return null;

  // Create data for the pie chart
  const data: DataItem[] = selectedSkinTone.shades.map((shade, index) => ({
    name: `Shade ${index + 1}`,
    value: 1,
    color: shade
  }));

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload as DataItem;
      return (
        <div className="bg-white p-2 rounded shadow">
          <p className="text-sm">Color: {data.color}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <h3 className="text-[#212121] text-xl font-semibold mb-3 font-poppins">
        Shades That Shine On You
      </h3>
      <div className="w-full max-w-[280px] mx-auto">
        <div className="relative">
          <PieChart width={280} height={140}>
            <Pie
              data={data}
              cx={140}
              cy={70}
              innerRadius={0}
              outerRadius={65}
              paddingAngle={1}
              dataKey="value"
              stroke="#fff"
              strokeWidth={1}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={CustomTooltip} cursor={false} />
          </PieChart>
        </div>
      </div>
    </div>
  );
};

export default ColorWheel; 
