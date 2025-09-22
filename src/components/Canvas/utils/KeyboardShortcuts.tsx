import { useEffect } from 'react';
import { useCanvasStore } from '../CanvasProvider';
import { useReactFlow } from 'reactflow';

export function KeyboardShortcuts() {
  const { 
    setTool, 
    selection, 
    deleteNode, 
    deleteEdge,
    data 
  } = useCanvasStore();
  
  const { 
    fitView, 
    zoomIn, 
    zoomOut, 
    getNodes, 
    getEdges 
  } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = event;
      const cmdKey = ctrlKey || metaKey;

      // Prevent default browser shortcuts when canvas is focused
      if (cmdKey) {
        switch (key.toLowerCase()) {
          case 'z':
            event.preventDefault();
            if (shiftKey) {
              // Redo
            } else {
              // Undo
            }
            break;
          case 'y':
            event.preventDefault();
            // Redo
            break;
          case 'a':
            event.preventDefault();
            // Select all
            break;
          case 'c':
            event.preventDefault();
            // Copy
            break;
          case 'v':
            event.preventDefault();
            // Paste
            break;
          case 'd':
            event.preventDefault();
            // Duplicate
            break;
          case 'g':
            event.preventDefault();
            if (shiftKey) {
              // Ungroup
            } else {
              // Group
            }
            break;
          case '0':
            event.preventDefault();
            fitView({ duration: 200, padding: 0.2 });
            break;
          case '=':
          case '+':
            event.preventDefault();
            zoomIn({ duration: 200 });
            break;
          case '-':
            event.preventDefault();
            zoomOut({ duration: 200 });
            break;
        }
      }

      // Tool shortcuts (without cmd key)
      if (!cmdKey) {
        switch (key.toLowerCase()) {
          case 'v':
            setTool('select');
            break;
          case 'h':
            setTool('pan');
            break;
          case 't':
            setTool('text');
            break;
          case 'n':
            setTool('note');
            break;
          case 'c':
            setTool('connect');
            break;
          case 'g':
            setTool('group');
            break;
          case 'escape':
            setTool('select');
            break;
          case 'delete':
          case 'backspace':
            // Delete selected nodes and edges
            selection.nodeIds.forEach(nodeId => deleteNode(nodeId));
            selection.edgeIds.forEach(edgeId => deleteEdge(edgeId));
            break;
        }
      }

      // Space for pan tool
      if (key === ' ' && !event.repeat) {
        event.preventDefault();
        setTool('pan');
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();
        setTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    setTool, 
    selection, 
    deleteNode, 
    deleteEdge, 
    fitView, 
    zoomIn, 
    zoomOut
  ]);

  return null;
}