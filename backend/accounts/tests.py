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
