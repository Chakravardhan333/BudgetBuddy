from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ProfileUpdateSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
)

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/accounts/login/
    Takes username and password, returns JWT tokens with embedded user profile metadata.
    """
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(APIView):
    """
    POST /api/accounts/register/
    Registers a new user and issues access/refresh tokens immediately.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            profile = getattr(user, 'profile', None)

            return Response({
                "message": "User registered successfully.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "full_name": f"{user.first_name} {user.last_name}".strip() or user.username,
                    "role": profile.role if profile else "student",
                    "currency": profile.currency if profile else "USD",
                    "currency_symbol": profile.currency_symbol if profile else "$",
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """
    GET /api/accounts/profile/  -> Returns authenticated user's complete profile
    PUT / PATCH /api/accounts/profile/ -> Updates authenticated user's profile
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = ProfileUpdateSerializer(
            instance=request.user,
            data=request.data,
            context={'request': request},
            partial=True
        )
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Profile updated successfully.",
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    patch = put


class ChangePasswordView(APIView):
    """
    POST /api/accounts/change-password/
    Verifies existing password and sets new password for authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {"old_password": ["Current password is incorrect."]},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response(
                {"message": "Password updated successfully."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """
    POST /api/accounts/logout/
    Logs out authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            # If blacklisting fails (e.g. app not added or token already expired),
            # still return successful logout acknowledgement so client clears storage.
            pass
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """
    POST /api/accounts/password-reset/request/
    Dispatches a password reset token/link if the email exists, without leaking account enumeration.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .serializers import PasswordResetRequestSerializer
        from django.contrib.auth.models import User
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import send_mail
        from django.conf import settings
        import logging

        logger = logging.getLogger(__name__)
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.filter(email__iexact=email).first()
            if user:
                token = default_token_generator.make_token(user)
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                reset_link = f"/forgot-password?uid={uidb64}&token={token}"
                logger.info(f"Password reset generated for {email}: {reset_link}")
                try:
                    if getattr(settings, 'EMAIL_HOST_USER', None):
                        send_mail(
                            subject="BudgetBuddy Password Reset Request",
                            message=f"Hello {user.first_name or user.username},\n\nYou requested a password reset. Please use the following link to reset your password:\n{reset_link}\n\nIf you did not make this request, you can safely ignore this email.",
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[user.email],
                            fail_silently=True,
                        )
                except Exception as e:
                    logger.warning(f"Could not dispatch password reset email: {e}")

            return Response({
                "message": "If an account with this email exists, password reset instructions have been generated."
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """
    POST /api/accounts/password-reset/confirm/
    Verifies uidb64 and token, and sets new password.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .serializers import PasswordResetConfirmSerializer
        from django.contrib.auth.models import User
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str

        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            uidb64 = serializer.validated_data['uidb64']
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']

            try:
                uid = force_str(urlsafe_base64_decode(uidb64))
                user = User.objects.get(pk=uid)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                return Response({"token": ["Invalid or expired reset token."]}, status=status.HTTP_400_BAD_REQUEST)

            if not default_token_generator.check_token(user, token):
                return Response({"token": ["Invalid or expired reset token."]}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_password)
            user.save()
            return Response({"message": "Password has been successfully updated. You may now sign in."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

