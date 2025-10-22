import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Box, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import type { Application, ApplicationStatus } from '../types';
import ApplicationCard from './ApplicationCard';
import { updateApplicationStatus } from '../services/applicationService';

interface KanbanBoardProps {
  applications: Application[];
  onEdit: (application: Application) => void;
  onDelete: (applicationId: string) => void;
  onViewDetails: (application: Application) => void;
  onRefresh: () => void;
}

const COLUMNS: { id: ApplicationStatus; title: string; color: string }[] = [
  { id: 'saved', title: 'Salvate', color: '#9e9e9e' },
  { id: 'applied', title: 'Candidate', color: '#2196f3' },
  { id: 'phone_screen', title: 'Tel. Screen', color: '#ff9800' },
  { id: 'interview', title: 'Colloquio', color: '#9c27b0' },
  { id: 'technical', title: 'Tecnico', color: '#673ab7' },
  { id: 'offer', title: 'Offerta', color: '#4caf50' },
  { id: 'rejected', title: 'Rifiutato', color: '#f44336' },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  applications,
  onEdit,
  onDelete,
  onViewDetails,
  onRefresh,
}) => {
  const [columns, setColumns] = useState<Record<ApplicationStatus, Application[]>>({} as any);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Organize applications by status
  useEffect(() => {
    const organized: Record<ApplicationStatus, Application[]> = {
      saved: [],
      applied: [],
      phone_screen: [],
      interview: [],
      technical: [],
      offer: [],
      rejected: [],
      withdrawn: [],
      archived: [],
    };

    applications.forEach((app) => {
      if (organized[app.status]) {
        organized[app.status].push(app);
      }
    });

    setColumns(organized);
  }, [applications]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    // Dropped in the same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceColumn = source.droppableId as ApplicationStatus;
    const destColumn = destination.droppableId as ApplicationStatus;

    // Same column - just reordering
    if (sourceColumn === destColumn) {
      const newItems = Array.from(columns[sourceColumn]);
      const [removed] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, removed);

      setColumns({
        ...columns,
        [sourceColumn]: newItems,
      });
      return;
    }

    // Moving to different column - update status
    setLoading(true);
    setError(null);

    try {
      const sourceItems = Array.from(columns[sourceColumn]);
      const destItems = Array.from(columns[destColumn]);
      const [movedItem] = sourceItems.splice(source.index, 1);

      // Update item status
      movedItem.status = destColumn;
      destItems.splice(destination.index, 0, movedItem);

      // Optimistic update
      setColumns({
        ...columns,
        [sourceColumn]: sourceItems,
        [destColumn]: destItems,
      });

      // Update in Firebase
      await updateApplicationStatus(draggableId, destColumn);
      onRefresh();
    } catch (err) {
      console.error('Error updating application status:', err);
      setError('Errore nell\'aggiornamento dello stato');
      // Revert on error
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 2,
            minHeight: '70vh',
          }}
        >
          {COLUMNS.map((column) => (
            <Paper
              key={column.id}
              sx={{
                minWidth: 300,
                maxWidth: 300,
                flex: '0 0 300px',
                p: 2,
                backgroundColor: '#f5f5f5',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                  pb: 1,
                  borderBottom: `3px solid ${column.color}`,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {column.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    backgroundColor: column.color,
                    color: 'white',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  {columns[column.id]?.length || 0}
                </Typography>
              </Box>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 100,
                      backgroundColor: snapshot.isDraggingOver ? column.color + '20' : 'transparent',
                      border: snapshot.isDraggingOver ? `2px dashed ${column.color}` : '2px dashed transparent',
                      borderRadius: 1,
                      transition: 'all 0.2s ease',
                      p: 1,
                    }}
                  >
                    {columns[column.id]?.map((application, index) => (
                      <Draggable
                        key={application.id}
                        draggableId={application.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.9 : 1,
                              transform: snapshot.isDragging 
                                ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                                : provided.draggableProps.style?.transform,
                              boxShadow: snapshot.isDragging 
                                ? '0 8px 16px rgba(0,0,0,0.2)' 
                                : 'none',
                            }}
                          >
                            <ApplicationCard
                              application={application}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onViewDetails={onViewDetails}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Paper>
          ))}
        </Box>
      </DragDropContext>

      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default KanbanBoard;

