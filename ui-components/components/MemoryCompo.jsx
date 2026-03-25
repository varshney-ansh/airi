import { useState } from "react";
import MemoryCard from "./memoryCompo/MemoryCard";
import InitialMemorySec from "./memoryCompo/InitialMemorySec";

function MemoryCompo() {
  const [memories, setMemories] = useState([
    {
      id: 1,
      name: "Morning Echo",
      description:
        "In morning light, the city wakes, with fog that dances Lorem ipsum dolor sit amet, consectetur adipisicing elit. Minima eveniet accusamus deserunt vero vitae tempore incidunt cupiditate, voluptatibus neque officiis, veritatis nulla esse quis beatae hic qui. Officiis, sequi reprehenderit.",
    },
  ]);

  const handleDeleteMemory = (memoryId) => {
    setMemories((prevMemories) =>
      prevMemories.filter((memory) => memory.id !== memoryId),
    );
  };

  const handleUpdateMemory = (updatedMemory) => {
    setMemories((prevMemories) =>
      prevMemories.map((memory) =>
        memory.id === updatedMemory.id ? updatedMemory : memory,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-bg-app text-text-primary flex flex-col items-center justify-start p-6">
      {(!memories || memories.length === 0) && <InitialMemorySec />}
      {memories && memories.length > 0 && (
        <>
          <div className="mb-6">
            <h2 className="text-4xl max-lg:text-2xl font-bold">Memories</h2>
          </div>
          <div className="grid grid-cols-4 max-md:grid-cols-2 max-lg:grid-cols-3 max-sm:grid-cols-1 gap-4 w-full max-w-7xl select-none max-h-screen">
            {memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onDelete={handleDeleteMemory}
                onUpdate={handleUpdateMemory}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default MemoryCompo;
