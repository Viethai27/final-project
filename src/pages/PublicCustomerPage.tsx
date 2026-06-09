import CustomerLayout from '../layouts/customer/CustomerLayout';
import HomeCustomer from './customer/HomeCustomer';

export default function PublicCustomerPage() {
  return (
    <CustomerLayout>
      <HomeCustomer />
    </CustomerLayout>
  );
}
