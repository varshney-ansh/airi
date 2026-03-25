
function EditMemoryModal({editName, editDescription, setEditName, setEditDescription, setShowEditModal, handleSaveEdit}) {
  return (
   <div className="fixed inset-0 bg-bg-app/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-card rounded-2xl p-6 w-96 max-w-full mx-4 border border-border-default">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Edit Memory</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Memory Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-text-primary outline-none bg-bg-modal border border-border-default focus:border-border-active"
                placeholder="Enter memory name"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-text-primary resize-none outline-none bg-bg-modal border border-border-default lean-slider focus:border-border-active"
                placeholder="Enter memory description"
                rows={6}
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg border border-border-default text-text-primary opacity-50 cursor-pointer hover:opacity-100 transition-opacity "
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-accent-blue/50 text-text-primary hover:bg-accent-blue transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
  )
}

export default EditMemoryModal