import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import { validatePassword } from '../validators/passwordPolicy';

const initialForm = {
  firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (form.password !== form.confirmPassword) {
      setErrors(['Passwords do not match']);
      return;
    }
    const { valid, errors: policyErrors } = validatePassword(form.password);
    if (!valid) {
      setErrors(policyErrors);
      return;
    }

    setSubmitting(true);
    try {
      await authService.register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      });
      toast.success('Account created — please sign in');
      navigate('/login');
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Registration failed';
      const details = err.response?.data?.error?.details || [];
      setErrors(details.length ? details : [message]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <div className="card shadow-sm">
        <div className="card-body p-4">
          <h3 className="card-title mb-4 text-center">Create Account</h3>

          {errors.length > 0 && (
            <div className="alert alert-danger">
              <ul className="mb-0 ps-3">
                {errors.map((err) => <li key={err}>{err}</li>)}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="firstName" className="form-label">First Name</label>
                <input id="firstName" name="firstName" className="form-control" value={form.firstName} onChange={handleChange} required />
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="lastName" className="form-label">Last Name</label>
                <input id="lastName" name="lastName" className="form-control" value={form.lastName} onChange={handleChange} required />
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email</label>
              <input id="email" name="email" type="email" className="form-control" value={form.email} onChange={handleChange} required />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input id="password" name="password" type="password" className="form-control" value={form.password} onChange={handleChange} required />
              <div className="form-text">10+ characters, upper &amp; lower case, a digit, a special character.</div>
            </div>
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" className="form-control" value={form.confirmPassword} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
            <p className="text-center mt-3 mb-0 small">
              Already have an account?
              {' '}
              <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
