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
