import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getEvent, updateEvent } from '@/api/events';
import { getUploadedTickets } from '@/api/tickets';
import CreateEventPage from './CreateEventPage';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(null);
  const [eventStatus, setEventStatus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEvent(id);
      const e = res.data?.event || res.data;
      if (!e) {
        throw new Error('Event not found');
      }

      setEventStatus(e.status || null);
      setRejectionReason(e.rejection_reason || null);

      // Load uploaded tickets inventory for each ticket type if present
      const rawTypes = e.ticket_types || e.ticketTypes || [];
      const ticketTypes = await Promise.all(
        rawTypes.map(async (t) => {
          let uploaded = (t.uploadedTickets || t.uploaded_tickets || []).map((it) => ({
            id: it.id,
            file_url: it.file_url,
            file_name: it.file_name,
            is_assigned: it.is_assigned,
          }));
          if (t.id && uploaded.length === 0) {
            try {
              const invRes = await getUploadedTickets(t.id);
              const list = invRes.data?.tickets || invRes.data?.uploadedTickets || [];
              uploaded = list.map((it) => ({
                id: it.id,
                file_url: it.file_url,
                file_name: it.file_name,
                is_assigned: it.is_assigned,
              }));
            } catch {
              // Ignore if fails
            }
          }
          return {
            id: t.id,
            name: t.name || '',
            price: t.price ?? '',
            quantity: uploaded.length > 0 ? uploaded.length : (t.quantity ?? ''),
            description: t.description || '',
            section_type: t.section_type || 'general',
            early_bird_price: t.early_bird_price || '',
            early_bird_deadline: t.early_bird_deadline ? String(t.early_bird_deadline).slice(0, 10) : '',
            early_bird_max_qty: t.early_bird_max_qty || '',
            saleStartDate: t.sale_start ? String(t.sale_start).slice(0, 10) : (t.saleStartDate ? String(t.saleStartDate).slice(0, 10) : ''),
            saleEndDate: t.sale_end ? String(t.sale_end).slice(0, 10) : (t.saleEndDate ? String(t.saleEndDate).slice(0, 10) : ''),
            uploadedTickets: uploaded,
          };
        })
      );

      setInitialValues({
        title: e.title || '',
        description: e.description || '',
        category: e.category || '',
        tags: Array.isArray(e.tags) ? e.tags.join(', ') : e.tags || '',
        venue: e.venue || '',
        address: e.address || '',
        city: e.city || '',
        country: e.country || '',
        startDate: e.start_date ? String(e.start_date).slice(0, 10) : '',
        endDate: e.end_date ? String(e.end_date).slice(0, 10) : '',
        startTime: e.start_time ? String(e.start_time).slice(0, 5) : '',
        endTime: e.end_time ? String(e.end_time).slice(0, 5) : '',
        dressCode: e.dress_code || '',
        bannerImage: e.banner_image || '',
        ticketTemplate: e.ticket_template || '',
        additionalImages: Array.isArray(e.images) ? e.images : [],
        contactEmail: e.contact_email || '',
        contactPhone: e.contact_phone || '',
        totalCapacity: e.capacity || '',
        visibility: e.visibility || 'public',
        ticketTypes: ticketTypes.length > 0
          ? ticketTypes
          : [{ name: '', price: '', quantity: '', description: '', saleStartDate: '', saleEndDate: '', uploadedTickets: [] }],
      });
    } catch (err) {
      console.error('[EditEventPage.fetchEvent]', err);
      toast.error(err.response?.data?.message || 'Failed to load event for editing');
      navigate('/organizer/events');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const handleSubmit = async (data) => {
    await updateEvent(id, data);
  };

  if (loading || !initialValues) {
    return <LoadingSpinner label="Loading event for editing..." className="py-20" />;
  }

  return (
    <CreateEventPage
      initialValues={initialValues}
      eventId={id}
      onSubmit={handleSubmit}
      eventStatus={eventStatus}
      rejectionReason={rejectionReason}
    />
  );
}
