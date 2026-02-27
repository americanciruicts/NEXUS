# NEXUS User Credentials

**Total Users:** 29 (10 Admin + 19 Operator)
**Last Updated:** 2026-02-02

---

## Admin Users (10 total)

| ID | Username   | Email                          | First Name | Last Name | Password       | Role  | Approver |
|----|------------|--------------------------------|------------|-----------|----------------|-------|----------|
| 1  | adam       | adam@americancircuits.com      | Adam       |           | Wind8%Tree     | ADMIN | Yes      |
| 2  | kris       | kris@americancircuits.com      | Kris       |           | Fire3@Lake     | ADMIN | Yes      |
| 3  | alex       | alex@americancircuits.com      | Alex       |           | Snow6^Peak     | ADMIN | Yes      |
| 4  | preet      | preet@americancircuits.com     | Preet      |           | Star9#Moon     | ADMIN | Yes      |
| 5  | kanav      | kanav@americancircuits.com     | Kanav      |           | Rock5$Wave     | ADMIN | Yes      |
| 6  | pratiksha  | pratiksha@americancircuits.com | Pratiksha  |           | Mango$42Tx     | ADMIN | Yes      |
| 7  | cathy      | cathy@americancircuits.com     | Cathy      |           | Blue7!River    | ADMIN | Yes      |
| 8  | admin      | admin@americancircuits.com     | Admin      |           | Cloud1&Rain    | ADMIN | Yes      |
| 27 | rob        | rob@aci.local                  | Rob        | User      | Ocean4#Tide    | ADMIN | Yes      |
| 28 | juliar     | juliar@aci.local               | Julia      | R         | Coral8@Reef    | ADMIN | Yes      |

---

## Operator Users (19 total)

| ID | Username     | Email                            | First Name | Last Name | Password       | Role     | Approver |
|----|--------------|----------------------------------|------------|-----------|----------------|----------|----------|
| 10 | bharat       | bharat@americancircuits.com      | Bharat     |           | Tiger4!Jump    | OPERATOR | No       |
| 11 | Obeida       | obeida@americancircuits.com      | Obedia     |           | Eagle2#Fly     | OPERATOR | No       |
| 12 | bhavin       | bhavin@americancircuits.com      | Bhavin     |           | Lion6$Roar     | OPERATOR | No       |
| 13 | Jayt         | jayt@americancircuits.com        | Jay T      |           | Hawk9@Soar     | OPERATOR | No       |
| 14 | kamlesh      | kamlesh@americancircuits.com     | Kamlesh    |           | Wolf3#Pack     | OPERATOR | No       |
| 15 | Daniel       | daniel@americancircuits.com      | Daniel     |           | Bear5!Cave     | OPERATOR | No       |
| 16 | colleen      | colleen@americancircuits.com     | Colleen    |           | Deer7@Field    | OPERATOR | No       |
| 17 | ramesh       | ramesh@americancircuits.com      | Ramesh     |           | Fox4$Hunt      | OPERATOR | No       |
| 18 | rameshkumar  | ramesh@americanciruits.com       | Ramesh     |           | Owl8#Night     | OPERATOR | No       |
| 19 | keola        | keola@americancircuits.com       | Keola      |           | Swan2!Lake     | OPERATOR | No       |
| 20 | jackie       | jackie@americancircuits.com      | Jackie     |           | Dove9@Peace    | OPERATOR | No       |
| 21 | crystal      | crystal@americancircuits.com     | Crystal    |           | Seal6#Ocean    | OPERATOR | No       |
| 22 | tatyana      | tatyana@americancircuits.com     | Tatyana    |           | Lynx3$Wild     | OPERATOR | No       |
| 23 | maria        | maria@americancircuits.comq      | Maria      |           | Puma7!Speed    | OPERATOR | No       |
| 24 | sulma        | sulma@americancircuits.com       | Sulma      |           | Elk5@Forest    | OPERATOR | No       |
| 25 | theresa      | theresa@americancircuits.com     | Theresa    |           | Orca9#Deep     | OPERATOR | No       |
| 26 | jessica      | jessica@americancircuits.com     | Jessica    |           | Raven4$Dark    | OPERATOR | No       |
| 29 | admin1       | admin1@americancircuits.com      | admin      |           | Test1@Pass     | OPERATOR | No       |
| -  | user1        | user1@aci.local                  | User       | One       | Tiger4!Jump    | OPERATOR | No       |
| -  | user2        | user2@aci.local                  | User       | Two       | Eagle2#Fly     | OPERATOR | No       |

---

## Important Security Notes

⚠️ **Passwords in the database are hashed using bcrypt and CANNOT be retrieved in plain text.**

### About These Credentials

1. **Original Users (IDs 1-29):** These users exist in the database with bcrypt-hashed passwords. The passwords shown above are **newly generated temporary passwords** since the original passwords cannot be retrieved from the database.

2. **Test Users (user1, user2):** These are from the original setup and their passwords are shown as originally created.

3. **Email Typo:** Note that user ID 18 (rameshkumar) has a typo in email: `americanciruits.com` (missing 'c')

### Password Reset Required

**All users (except user1 and user2) will need to reset their passwords using one of these methods:**

1. **Admin Reset:**
   - Log in as admin
   - Go to User Management
   - Reset the user's password

2. **Self-Service Reset:**
   - Go to login page
   - Click "Reset Password"
   - Enter username and new password

3. **Direct Database Reset (for testing):**
   - Use the backend script: `python sync_users.py`

### Security Best Practices

1. **Change Default Passwords:** All users should change their passwords after first login
2. **Strong Passwords:** Minimum 8 characters with special characters and numbers
3. **Secure Storage:** Keep this file secure and do NOT commit to public repositories
4. **Regular Audits:** Review user access and permissions regularly
5. **Deactivate Unused:** Set `is_active=false` for users who no longer need access

### User Status Notes

From the database backup (2026-01-28):
- **Active Users:** 27 out of 29
- **Inactive Users:**
  - ID 17 (ramesh) - Deactivated on 2026-01-13
  - ID 29 (admin1) - Deactivated on 2026-01-16

---

## User Management Commands

### Create New User
```bash
cd /home/tony/NEXUS/backend
python -c "
from database import SessionLocal
from models import User, UserRole
from routers.auth import get_password_hash

db = SessionLocal()
user = User(
    username='newuser',
    email='newuser@americancircuits.com',
    first_name='First',
    last_name='Last',
    hashed_password=get_password_hash('TempPass1!'),
    role=UserRole.OPERATOR,
    is_approver=False,
    is_active=True
)
db.add(user)
db.commit()
print(f'Created user: {user.username}')
db.close()
"
```

### Reset User Password
```bash
cd /home/tony/NEXUS/backend
python -c "
from database import SessionLocal
from models import User
from routers.auth import get_password_hash

db = SessionLocal()
user = db.query(User).filter(User.username == 'username').first()
if user:
    user.hashed_password = get_password_hash('NewPassword1!')
    db.commit()
    print(f'Password reset for: {user.username}')
else:
    print('User not found')
db.close()
"
```

### List All Users
```bash
cd /home/tony/NEXUS/backend
python -c "
from database import SessionLocal
from models import User

db = SessionLocal()
users = db.query(User).order_by(User.role.desc(), User.username).all()
print(f'Total users: {len(users)}\n')
for u in users:
    status = '✓' if u.is_active else '✗'
    approver = 'Yes' if u.is_approver else 'No'
    print(f'{status} {u.id:2d} | {u.username:15s} | {u.email:35s} | {u.role.value:8s} | Approver: {approver}')
db.close()
"
```

---

## Role Descriptions

### ADMIN
- Full system access
- User management (create, edit, delete users)
- Delete travelers and records
- Access to all reports
- System configuration
- Approval permissions (if is_approver=true)

### OPERATOR
- Create and edit travelers
- Track labor hours
- View own data and assigned travelers
- Submit approval requests
- Limited reporting access
- Cannot delete records or manage users

---

**For password assistance, contact system administrator or use the reset password feature.**
