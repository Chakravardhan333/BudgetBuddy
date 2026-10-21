from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            'role',
            'currency',
            'currency_symbol',
            'phone_number',
            'bio',
            'monthly_budget_target',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at', 'currency_symbol')


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_staff',
            'is_superuser',
            'date_joined',
            'profile',
        )
        read_only_fields = ('id', 'is_staff', 'is_superuser', 'date_joined')


class RegisterSerializer(serializers.ModelSerializer):
    REGISTRATION_ROLE_CHOICES = (
        ('student', 'Student'),
        ('premium', 'Premium User'),
    )

    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(choices=REGISTRATION_ROLE_CHOICES, default='student', required=False)
    currency = serializers.CharField(max_length=10, default='USD', required=False)

    class Meta:
        model = User
        fields = (
            'username',
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'role',
            'currency',
        )

    def validate_email(self, value):
        val = value.strip().lower()
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return val

    def validate_username(self, value):
        val = value.strip()
        if User.objects.filter(username__iexact=val).exists():
            raise serializers.ValidationError("This username is already taken.")
        return val

    def validate_currency(self, value):
        val = value.upper().strip()
        if val not in UserProfile.CURRENCY_SYMBOLS:
            supported = ', '.join(UserProfile.CURRENCY_SYMBOLS.keys())
            raise serializers.ValidationError(f"Invalid currency '{value}'. Supported currencies are: {supported}.")
        return val

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Password fields do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        role = validated_data.pop('role', 'student')
        currency = validated_data.pop('currency', 'USD')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )

        # Update profile created via signal
        profile = getattr(user, 'profile', None)
        if not profile:
            profile = UserProfile.objects.create(user=user)
        profile.role = role
        profile.currency = currency
        profile.save()

        return user


class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    currency = serializers.CharField(max_length=10, required=False)
    monthly_budget_target = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    def validate_email(self, value):
        user = self.context['request'].user
        if User.objects.filter(email__iexact=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return value.lower()

    def update(self, instance, validated_data):
        user = instance
        profile = user.profile

        # Update User model fields
        if 'first_name' in validated_data:
            user.first_name = validated_data['first_name']
        if 'last_name' in validated_data:
            user.last_name = validated_data['last_name']
        if 'email' in validated_data:
            user.email = validated_data['email']
        user.save()

        # Update UserProfile fields
        if 'phone_number' in validated_data:
            profile.phone_number = validated_data['phone_number']
        if 'bio' in validated_data:
            profile.bio = validated_data['bio']
        if 'currency' in validated_data:
            profile.currency = validated_data['currency']
        if 'monthly_budget_target' in validated_data:
            profile.monthly_budget_target = validated_data['monthly_budget_target']
        profile.save()

        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        return attrs


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {
        'no_active_account': 'Invalid username or password. Please try again.'
    }

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        profile = getattr(user, 'profile', None)

        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'role': profile.role if profile else 'student',
            'currency': profile.currency if profile else 'USD',
            'currency_symbol': profile.currency_symbol if profile else '$',
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }
        return data
