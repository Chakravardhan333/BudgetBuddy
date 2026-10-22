from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

class AccountsAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.profile_url = reverse('user_profile')
        self.change_password_url = reverse('change_password')
        self.token_refresh_url = reverse('token_refresh')

        self.user_data = {
            'username': 'student_user',
            'email': 'student@budgetbuddy.test',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!',
            'first_name': 'Alex',
            'last_name': 'Taylor',
            'role': 'student',
            'currency': 'USD',
        }

    def test_successful_registration(self):
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'student_user')
        self.assertEqual(response.data['user']['role'], 'student')
        self.assertEqual(response.data['user']['currency'], 'USD')
        self.assertEqual(response.data['user']['currency_symbol'], '$')

        # Verify DB entry
        user = User.objects.get(username='student_user')
        self.assertEqual(user.profile.currency, 'USD')

    def test_registration_duplicate_username(self):
        self.client.post(self.register_url, self.user_data, format='json')
        # Try registering same username again
        duplicate_data = self.user_data.copy()
        duplicate_data['email'] = 'another@budgetbuddy.test'
        response = self.client.post(self.register_url, duplicate_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_registration_password_mismatch(self):
        invalid_data = self.user_data.copy()
        invalid_data['password_confirm'] = 'DifferentPassword123!'
        response = self.client.post(self.register_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)

    def test_registration_duplicate_email(self):
        self.client.post(self.register_url, self.user_data, format='json')
        duplicate_email_data = self.user_data.copy()
        duplicate_email_data['username'] = 'completely_different_user'
        response = self.client.post(self.register_url, duplicate_email_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertIn('already exists', str(response.data['email'][0]))

    def test_registration_invalid_role(self):
        invalid_role_data = self.user_data.copy()
        invalid_role_data['role'] = 'unauthorized_role'
        response = self.client.post(self.register_url, invalid_role_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('role', response.data)

    def test_registration_invalid_currency(self):
        invalid_curr_data = self.user_data.copy()
        invalid_curr_data['currency'] = 'FAKE_CURRENCY'
        response = self.client.post(self.register_url, invalid_curr_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('currency', response.data)

    def test_registration_missing_required_fields(self):
        response = self.client.post(self.register_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)
        self.assertIn('email', response.data)
        self.assertIn('password', response.data)

    def test_registration_followed_by_login(self):
        reg_response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(reg_response.status_code, status.HTTP_201_CREATED)

        login_response = self.client.post(self.login_url, {
            'username': self.user_data['username'],
            'password': self.user_data['password'],
        }, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_response.data)

    def test_user_data_isolation(self):
        # Register user A
        user_a_data = self.user_data.copy()
        user_a_data['username'] = 'user_isolation_a'
        user_a_data['email'] = 'user_a@test.com'
        reg_a = self.client.post(self.register_url, user_a_data, format='json')
        token_a = reg_a.data['access']

        # Register user B
        user_b_data = self.user_data.copy()
        user_b_data['username'] = 'user_isolation_b'
        user_b_data['email'] = 'user_b@test.com'
        reg_b = self.client.post(self.register_url, user_b_data, format='json')

        # User A requests their own profile
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
        profile_res = self.client.get(self.profile_url)
        self.assertEqual(profile_res.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_res.data['username'], 'user_isolation_a')
        self.assertNotEqual(profile_res.data['username'], 'user_isolation_b')

    def test_successful_login(self):
        # Register first
        self.client.post(self.register_url, self.user_data, format='json')

        # Login
        login_payload = {
            'username': 'student_user',
            'password': 'StrongPassword123!',
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'student_user')

    def test_login_invalid_credentials(self):
        self.client.post(self.register_url, self.user_data, format='json')
        login_payload = {
            'username': 'student_user',
            'password': 'WrongPassword123!',
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
        self.assertEqual(response.data['detail'], 'Invalid username or password. Please try again.')

    def test_login_missing_user(self):
        login_payload = {
            'username': 'completely_nonexistent_user',
            'password': 'SomePassword123!',
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
        self.assertEqual(response.data['detail'], 'Invalid username or password. Please try again.')

    def test_login_empty_credentials(self):
        # Empty payload
        response = self.client.post(self.login_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)
        self.assertIn('password', response.data)

        # Missing password only
        response_user_only = self.client.post(self.login_url, {'username': 'test_user'}, format='json')
        self.assertEqual(response_user_only.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response_user_only.data)

    def test_login_inactive_user(self):
        user = User.objects.create_user(username='disabled_user', password='DisabledPassword123!')
        user.is_active = False
        user.save()

        login_payload = {
            'username': 'disabled_user',
            'password': 'DisabledPassword123!',
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_profile_requires_auth(self):
        # Without authorization header
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_profile_access_and_update(self):
        # Register and get token
        reg_res = self.client.post(self.register_url, self.user_data, format='json')
        access_token = reg_res.data['access']

        # Access profile with Bearer token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_res = self.client.get(self.profile_url)
        self.assertEqual(profile_res.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_res.data['username'], 'student_user')

        # Update profile (change currency to EUR)
        update_res = self.client.put(self.profile_url, {
            'first_name': 'Alexander',
            'currency': 'EUR',
            'phone_number': '+1234567890',
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)

        # Verify updated values
        get_updated = self.client.get(self.profile_url)
        self.assertEqual(get_updated.data['first_name'], 'Alexander')
        self.assertEqual(get_updated.data['profile']['currency'], 'EUR')
        self.assertEqual(get_updated.data['profile']['currency_symbol'], '€')

    def test_change_password(self):
        reg_res = self.client.post(self.register_url, self.user_data, format='json')
        access_token = reg_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        # Try changing password with wrong old password
        res_fail = self.client.post(self.change_password_url, {
            'old_password': 'IncorrectOldPassword123!',
            'new_password': 'BrandNewPassword123!',
            'new_password_confirm': 'BrandNewPassword123!',
        }, format='json')
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # Change with correct old password
        res_success = self.client.post(self.change_password_url, {
            'old_password': 'StrongPassword123!',
            'new_password': 'BrandNewPassword123!',
            'new_password_confirm': 'BrandNewPassword123!',
        }, format='json')
        self.assertEqual(res_success.status_code, status.HTTP_200_OK)

        # Login with new password should succeed
        self.client.credentials() # clear header
        new_login = self.client.post(self.login_url, {
            'username': 'student_user',
            'password': 'BrandNewPassword123!',
        }, format='json')
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)

    def test_password_reset_request_and_confirm(self):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        # Create user
        user = User.objects.create_user(username='reset_user', email='reset@budgetbuddy.test', password='OldPassword123!')

        # 1. Request password reset
        req_res = self.client.post(reverse('password_reset_request'), {'email': 'reset@budgetbuddy.test'}, format='json')
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)

        # 2. Confirm password reset with generated token
        token = default_token_generator.make_token(user)
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))

        confirm_payload = {
            'uidb64': uidb64,
            'token': token,
            'new_password': 'BrandNewSecurePassword123!',
            'new_password_confirm': 'BrandNewSecurePassword123!',
        }
        confirm_res = self.client.post(reverse('password_reset_confirm'), confirm_payload, format='json')
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        # 3. Verify user can now login with new password
        login_res = self.client.post(self.login_url, {
            'username': 'reset_user',
            'password': 'BrandNewSecurePassword123!',
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

    def test_login_with_email(self):
        self.client.post(self.register_url, self.user_data, format='json')
        # Login using email instead of username
        response = self.client.post(self.login_url, {
            'username': 'student@budgetbuddy.test',
            'password': 'StrongPassword123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'student_user')

    def test_login_with_case_insensitive_username(self):
        self.client.post(self.register_url, self.user_data, format='json')
        response = self.client.post(self.login_url, {
            'username': 'STUDENT_USER',
            'password': 'StrongPassword123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'student_user')

    def test_login_with_whitespace_username(self):
        self.client.post(self.register_url, self.user_data, format='json')
        response = self.client.post(self.login_url, {
            'username': '  student_user  ',
            'password': 'StrongPassword123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'student_user')

    def test_login_deactivated_account_message(self):
        self.client.post(self.register_url, self.user_data, format='json')
        user = User.objects.get(username='student_user')
        user.is_active = False
        user.save()

        response = self.client.post(self.login_url, {
            'username': 'student_user',
            'password': 'StrongPassword123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
        self.assertIn('deactivated', str(response.data['detail']))

    def test_registration_rejects_admin_role(self):
        admin_reg = self.user_data.copy()
        admin_reg['username'] = 'attempted_admin'
        admin_reg['email'] = 'attempted_admin@budgetbuddy.test'
        admin_reg['role'] = 'admin'
        response = self.client.post(self.register_url, admin_reg, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('role', response.data)

    def test_health_check_endpoint(self):
        response = self.client.get(reverse('health_check'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'healthy')
        self.assertIn('environment', response.data)
        self.assertIn('database', response.data)
        self.assertEqual(response.data['database'], 'connected')

