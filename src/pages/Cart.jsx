import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { submitOrder } from '../services/stitchClient';

function Cart() {
  const { cart, updateQuantity, clearCart } = useCart();
  const [formData, setFormData] = useState({ name: '', contact: '', table: '' });
  const [orderStatus, setOrderStatus] = useState(null);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOrderStatus('submitting');
    try {
      await submitOrder({
        items: cart,
        customer_name: formData.name,
        contact: formData.contact,
        table_number: formData.table,
        total,
        status: 'pending',
      });
      setOrderStatus('success');
      clearCart();
    } catch {
      setOrderStatus('error');
    }
  };

  if (orderStatus === 'success') {
    return (
      <div className="page-shell" style={{ textAlign: 'center' }}>
        <h1 className="section-title">Order Confirmed</h1>
        <p className="page-lead" style={{ marginBottom: '1.5rem' }}>
          Thank you! Your order has been placed.
        </p>
        <button type="button" className="btn" onClick={() => setOrderStatus(null)}>
          New Order
        </button>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <h1 className="section-title">Your Cart</h1>

      {cart.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Your cart is empty.
        </p>
      ) : (
        <div className="cart-layout">
          <div className="cart-panel">
            {cart.map((item) => (
              <div key={item.id} className="cart-row">
                <div>
                  <h3 className="cart-row-title">{item.name}</h3>
                  <p className="cart-row-price">₹{item.price}</p>
                </div>
                <div className="cart-qty">
                  <button type="button" className="btn" onClick={() => updateQuantity(item.id, -1)}>
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" className="btn" onClick={() => updateQuantity(item.id, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
            <p className="cart-total">Total: ₹{total}</p>
          </div>

          <form className="form-panel form-stack" onSubmit={handleSubmit}>
            <h2 className="form-heading">Checkout</h2>
            <input
              required
              className="form-input"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              required
              className="form-input"
              placeholder="Phone or email"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            />
            <input
              required
              className="form-input"
              placeholder="Table or Pickup"
              value={formData.table}
              onChange={(e) => setFormData({ ...formData, table: e.target.value })}
            />
            <button type="submit" className="btn btn-primary" disabled={orderStatus === 'submitting'}>
              {orderStatus === 'submitting' ? 'Placing…' : 'Submit Order'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Cart;
