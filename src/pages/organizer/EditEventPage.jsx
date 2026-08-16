import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getEvent, updateEvent } from '@/api/events';
import CreateEventPage from './CreateEventPage';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(null);
  const [eventStatus, setEventStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEvent(id);
      const e = res.data?.event || res.data;
      setEventStatus(e.status || null);
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
        startTime: e.start_time || '',
        endTime: e.end_time || '',
        dressCode: e.dress_code || '',
        bannerImage: e.banner_image || '',
        additionalImages: Array.isArray(e.images) ? e.images : [],
        contactEmail: e.contact_email || '',
        contactPhone: e.contact_phone || '',
        totalCapacity: e.capacity || '',
        visibility: e.visibility || 'public',
        ticketTypes: (e.ticket_types || []).length
          ? e.ticket_types.map((t) => ({
              name: t.name || '',
              price: t.price || '',
              quantity: t.quantity || '',
              description: t.description || '',
              saleStartDate: t.sale_start ? String(t.sale_start).slice(0, 10) : '',
              saleEndDate: t.sale_end ? String(t.sale_end).slice(0, 10) : '',
            }))
          : [{ name: '', price: '', quantity: '', description: '', saleStartDate: '', saleEndDate: '' }],
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load event');
      navigate('/organizer/events');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const handleSubmit = async (data) => {
    await updateEvent(id, data);
  };

  if (loading || !initialValues) return <LoadingSpinner label="Loading event for editing..." className="py-20" />;

  return <CreateEventPage initialValues={initialValues} eventId={id} onSubmit={handleSubmit} eventStatus={eventStatus} />;
}
