import { useState } from "react";
import EditMemoryModal from "./EditMemoryModal";
import { NotebookPen, SquarePen, Trash } from "lucide-react";

function MemoryCard({ memory, onDelete, onUpdate }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(memory?.name);
  const [editDescription, setEditDescription] = useState(memory?.description);

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate({
        ...memory,
        name: editName,
        description: editDescription,
      });
    }
    setShowEditModal(false);
  };

  const handleDelete = () => {
    if (onDelete && memory?.id) {
      onDelete(memory.id);
    }
  };

  return (
    <>
      <div
        className="w-72 h-80 rounded-2xl bg-bg-modal p-4 transition-all duration-200 hover:shadow-2xl border border-border-default"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex justify-between items-center mb-4">
          <span>
            <NotebookPen />
          </span>
          {isHovered && (
            <div className="flex gap-2 text-text-muted">
              <button
                onClick={handleEdit}
                className="transition-colors cursor-pointer hover:text-text-primary"
                aria-label="Edit memory"
              >
                <SquarePen size={16} />
              </button>
              <button
                onClick={handleDelete}
                className="transition-colors cursor-pointer hover:text-accent-red"
                aria-label="Delete memory"
              >
                <Trash size={16} />
              </button>
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold text-text-primary mb-3">
          {memory?.name}
        </h3>
        <p className="text-sm text-text-secondary font-semibold line-clamp-10">
          {memory?.description}
        </p>
      </div>

      {showEditModal && (
        <EditMemoryModal
          editDescription={editDescription}
          editName={editName}
          setEditDescription={setEditDescription}
          setEditName={setEditName}
          handleSaveEdit={handleSaveEdit}
          setShowEditModal={setShowEditModal}
        />
      )}
    </>
  );
}

export default MemoryCard;