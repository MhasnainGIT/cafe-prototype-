import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { submitOrder } from '../services/stitchClient';

function Cart() {
  const { cart, updateQuantity, clearCart } = useCart();
  const [formData, setFormData] = useState({ name: '', contact: '', table: '' });
  const [orderStatus, setOrderStatus] = useState(null);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOrderStatus('submitting');
    try {
      await submitOrder({
        items: cart,
        customer_name: formData.name,
        contact: formData.contact,
        table_number: formData.table,
        total: total,
        status: 'pending'
      });
      setOrderStatus('success');
      clearCart();
    } catch (err) {
      setOrderStatus('error');
    }
  };

  if (orderStatus === 'success') {
    return (
      <div className="section" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <h1 className="section-title">Order Confirmed</h1>
        <p style={{ color: 'var(--color-cream)', fontSize: '1.2rem' }}>Thank you! Your order has been placed.</p>
        <button className="btn" style={{ marginTop: '2rem' }} onClick={() => setOrderStatus(null)}>New Order</button>
      </div>
    );
  }

  return (
    <div className="section" style={{ paddingTop: '120px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="section-title">Your Cart</h1>
      
      {cart.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-muted)' }}>Your cart is empty.</p>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: '4px' }}>
            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--color-cream)' }}>{item.name}</h3>
                  <p style={{ margin: 0, color: 'var(--color-gold)' }}>${item.price}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button className="btn" style={{ padding: '0.2rem 0.5rem' }} onClick={() => updateQuantity(item.id, -1)}>-</button>
                  <span>{item.quantity}</span>
                  <button className="btn" style={{ padding: '0.2rem 0.5rem' }} onClick={() => updateQuantity(item.id, 1)}>+</button>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'right', fontSize: '1.5rem', color: 'var(--color-gold)', marginTop: '2rem' }}>
              Total: ${total}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ color: 'var(--color-cream)', marginBottom: '1rem' }}>Checkout Details</h2>
            <input required placeholder="Name" style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input required placeholder="Contact (Phone/Email)" style={inputStyle} value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            <input required placeholder="Table Number or 'Pickup'" style={inputStyle} value={formData.table} onChange={e => setFormData({...formData, table: e.target.value})} />
            <button type="submit" className="btn btn-primary" disabled={orderStatus === 'submitting'} style={{ marginTop: '1rem' }}>
              {orderStatus === 'submitting' ? 'Placing Order...' : 'Submit Order'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  background: 'var(--color-bg)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--color-text)',
  padding: '1rem',
  fontFamily: 'var(--font-body)'
};

export default Cart;
