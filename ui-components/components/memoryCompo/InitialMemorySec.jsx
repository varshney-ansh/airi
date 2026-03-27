import MemoryCard from "./MemoryCard";

const INITIAL_CARDS = [
  {
    id: 1,
    name: "Morning Echo",
    description: "In morning light, the city wakes, with fog that dances Lorem ipsum dolor sit amet, consectetur adipisicing elit. Minima eveniet accusamus deserunt vero vitae tempore incidunt cupiditate, voluptatibus neque officiis, veritatis nulla esse quis beatae hic qui. Officiis, sequi reprehenderit."
  },
  {
    id: 2,
    name: "Golden Horizon",
    description: "As sunlight spills across the quiet streets, whispers of a new day begin Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quasi, perferendis. Repudiandae, cumque laboriosam! Temporibus eligendi perspiciatis natus reiciendis, deserunt facilis error, magni illum eaque quia amet molestiae deleniti neque fuga."
  },
  {
    id: 3,
    name: "Twilight Whispers",
    description: "When evening settles in soft hues of violet and amber Lorem ipsum dolor sit amet, consectetur adipisicing elit. Voluptates dignissimos distinctio velit dolorum impedit excepturi ad odit, modi alias quas blanditiis ratione quae molestiae provident aliquid nobis enim ullam tempora."
  },
  {
    id: 4,
    name: "Midnight Reflections",
    description: "Under a sky scattered with silent stars and distant lights Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eius, voluptatum? Similique at recusandae praesentium, quia totam maiores, nam sed perferendis, repellendus quaerat inventore earum. Assumenda, numquam. Neque sequi beatae minus."
  }
];

function InitialMemorySec() {
  const fakeDelete = () => {
    console.log("Delete clicked");
  };
  const fakeUpdate = () => {
    console.log("Update clicked");
  };
  return (
    <>
      <div className="grid grid-cols-4 max-md:grid-cols-2 max-lg:grid-cols-3 max-sm:grid-cols-1 gap-6 w-full max-w-7xl select-none max-h-screen overflow-hidden">
        {INITIAL_CARDS.map((card) => (
          <MemoryCard
            key={card.id}
            onDelete={fakeDelete}
            onUpdate={fakeUpdate}
            memory={card}
          />
        ))}
      </div>

      {/* Hero Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-linear-to-b from-transparent via-bg-app to-bg-app via-35%">
        <h1 className="text-2xl md:text-xl font-bold  mb-8 max-w-md leading-tight">
          Organize thoughts, edit, <br /> and share your documents
        </h1>
      </div>
    </>
  );
}

export default InitialMemorySec;