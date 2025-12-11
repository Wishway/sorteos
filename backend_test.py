#!/usr/bin/env python3
"""
Backend Testing for WishWay Raffle Platform - New Improvements
Testing specific scenarios requested:
1. Boleto approval validation (Backend)
2. Admin boletos-pendientes endpoint
3. User redirect after purchase (backend verification)
4. Ganadores data structure validation
"""

import requests
import json
import sys
import os
from datetime import datetime, timezone

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://rafflewave-1.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@wishway.com"
ADMIN_PASSWORD = "admin123"
USER_EMAIL = "usuario@test.com"
USER_PASSWORD = "test123"

class TestResults:
    def __init__(self):
        self.tests = []
        self.passed = 0
        self.failed = 0
    
    def add_test(self, name, passed, details=""):
        self.tests.append({
            'name': name,
            'passed': passed,
            'details': details
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1
    
    def print_summary(self):
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {len(self.tests)}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {(self.passed/len(self.tests)*100):.1f}%" if self.tests else "0%")
        
        if self.failed > 0:
            print(f"\n{'='*60}")
            print(f"FAILED TESTS:")
            print(f"{'='*60}")
            for test in self.tests:
                if not test['passed']:
                    print(f"❌ {test['name']}")
                    if test['details']:
                        print(f"   Details: {test['details']}")
        
        print(f"\n{'='*60}")
        print(f"ALL TEST RESULTS:")
        print(f"{'='*60}")
        for test in self.tests:
            status = "✅ PASSED" if test['passed'] else "❌ FAILED"
            print(f"{status}: {test['name']}")
            if test['details']:
                print(f"   Details: {test['details']}")

def login_user(email, password):
    """Login and return session token"""
    try:
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": email,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            # Get session token from cookie or response
            session_token = None
            if 'Set-Cookie' in response.headers:
                cookies = response.headers['Set-Cookie']
                for cookie in cookies.split(';'):
                    if 'session_token=' in cookie:
                        session_token = cookie.split('session_token=')[1].split(';')[0]
                        break
            
            if not session_token and 'session_token' in data:
                session_token = data['session_token']
            
            return {
                'success': True,
                'session_token': session_token,
                'user_data': data,
                'cookies': response.cookies
            }
        else:
            return {
                'success': False,
                'error': f"Login failed: {response.status_code} - {response.text}"
            }
    except Exception as e:
        return {
            'success': False,
            'error': f"Login error: {str(e)}"
        }

def make_authenticated_request(method, endpoint, session_token=None, cookies=None, **kwargs):
    """Make authenticated request with session token"""
    headers = kwargs.get('headers', {})
    
    if session_token:
        headers['Authorization'] = f'Bearer {session_token}'
    
    kwargs['headers'] = headers
    
    if cookies:
        kwargs['cookies'] = cookies
    
    url = f"{API_BASE}{endpoint}"
    
    if method.upper() == 'GET':
        return requests.get(url, **kwargs)
    elif method.upper() == 'POST':
        return requests.post(url, **kwargs)
    elif method.upper() == 'PUT':
        return requests.put(url, **kwargs)
    elif method.upper() == 'DELETE':
        return requests.delete(url, **kwargs)

def test_admin_boletos_pendientes(results):
    """Test 2: Test admin boletos-pendientes endpoint"""
    print("\n" + "="*60)
    print("TEST 2: Admin Boletos Pendientes Endpoint")
    print("="*60)
    
    # Login as admin
    admin_login = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_login['success']:
        results.add_test("Admin Login for Boletos Pendientes", False, admin_login['error'])
        return
    
    results.add_test("Admin Login for Boletos Pendientes", True, "Successfully logged in as admin")
    
    # Test GET /api/admin/boletos-pendientes
    try:
        response = make_authenticated_request(
            'GET', 
            '/admin/boletos-pendientes',
            session_token=admin_login['session_token'],
            cookies=admin_login['cookies']
        )
        
        if response.status_code == 200:
            boletos = response.json()
            print(f"✅ Successfully retrieved boletos pendientes: {len(boletos)} boletos")
            
            # Verify response structure includes user data
            required_user_fields = ['name', 'email', 'cedula', 'celular']
            structure_valid = True
            structure_details = []
            
            if boletos:
                # Check first boleto structure
                first_boleto = boletos[0]
                if 'usuario' in first_boleto:
                    usuario = first_boleto['usuario']
                    for field in required_user_fields:
                        if field in usuario:
                            structure_details.append(f"✅ {field}: {usuario.get(field, 'N/A')}")
                        else:
                            structure_details.append(f"❌ Missing {field}")
                            structure_valid = False
                else:
                    structure_valid = False
                    structure_details.append("❌ Missing 'usuario' field in boleto")
            else:
                structure_details.append("ℹ️ No pending boletos found (empty response)")
            
            results.add_test(
                "Admin Boletos Pendientes - Response Structure", 
                structure_valid or len(boletos) == 0,
                "; ".join(structure_details)
            )
            
            results.add_test(
                "Admin Boletos Pendientes - API Call", 
                True, 
                f"Retrieved {len(boletos)} pending boletos successfully"
            )
        else:
            results.add_test(
                "Admin Boletos Pendientes - API Call", 
                False, 
                f"API call failed: {response.status_code} - {response.text}"
            )
    
    except Exception as e:
        results.add_test("Admin Boletos Pendientes - API Call", False, f"Exception: {str(e)}")

def test_boleto_approval_validation(results):
    """Test 1: Test boleto approval validation (Backend)"""
    print("\n" + "="*60)
    print("TEST 1: Boleto Approval Validation")
    print("="*60)
    
    # Login as admin
    admin_login = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_login['success']:
        results.add_test("Admin Login for Approval Test", False, admin_login['error'])
        return
    
    results.add_test("Admin Login for Approval Test", True, "Successfully logged in as admin")
    
    # First, get pending boletos to find one to test with
    try:
        response = make_authenticated_request(
            'GET', 
            '/admin/boletos-pendientes',
            session_token=admin_login['session_token'],
            cookies=admin_login['cookies']
        )
        
        if response.status_code != 200:
            results.add_test("Get Pending Boletos for Test", False, f"Failed to get pending boletos: {response.status_code}")
            return
        
        boletos = response.json()
        if not boletos:
            # Create a test scenario by purchasing a boleto first
            print("ℹ️ No pending boletos found. Creating test scenario...")
            
            # Login as user to create a test boleto
            user_login = login_user(USER_EMAIL, USER_PASSWORD)
            if not user_login['success']:
                results.add_test("Create Test Boleto - User Login", False, user_login['error'])
                return
            
            # Get available sorteos
            sorteos_response = requests.get(f"{API_BASE}/sorteos")
            if sorteos_response.status_code != 200:
                results.add_test("Get Sorteos for Test", False, "Failed to get sorteos")
                return
            
            sorteos = sorteos_response.json()
            published_sorteos = [s for s in sorteos if s.get('estado') == 'published']
            
            if not published_sorteos:
                results.add_test("Find Published Sorteo for Test", False, "No published sorteos available for testing")
                return
            
            test_sorteo = published_sorteos[0]
            
            # Try to purchase a boleto
            purchase_data = {
                "sorteo_id": test_sorteo['id'],
                "numeros_boletos": [1],  # Try to buy boleto #1
                "metodo_pago": "transferencia"
            }
            
            purchase_response = make_authenticated_request(
                'POST',
                '/boletos/comprar',
                session_token=user_login['session_token'],
                cookies=user_login['cookies'],
                json=purchase_data
            )
            
            if purchase_response.status_code == 200:
                print("✅ Created test boleto for approval testing")
                
                # Get the newly created boleto
                response = make_authenticated_request(
                    'GET', 
                    '/admin/boletos-pendientes',
                    session_token=admin_login['session_token'],
                    cookies=admin_login['cookies']
                )
                boletos = response.json() if response.status_code == 200 else []
            else:
                results.add_test("Create Test Boleto", False, f"Failed to create test boleto: {purchase_response.status_code} - {purchase_response.text}")
                return
        
        if not boletos:
            results.add_test("Boleto Approval Validation Test", False, "No boletos available for testing approval validation")
            return
        
        # Use the first pending boleto for testing
        test_boleto = boletos[0]
        boleto_id = test_boleto['id']
        
        print(f"ℹ️ Testing with boleto ID: {boleto_id}")
        
        # First approval - should succeed
        approval_response = make_authenticated_request(
            'PUT',
            f'/admin/boleto/{boleto_id}/aprobar',
            session_token=admin_login['session_token'],
            cookies=admin_login['cookies'],
            params={'numero_comprobante': 'TEST-COMPROBANTE-001'}
        )
        
        if approval_response.status_code == 200:
            results.add_test("First Boleto Approval", True, "Successfully approved boleto")
            
            # Second approval attempt - should fail with 400 error
            second_approval_response = make_authenticated_request(
                'PUT',
                f'/admin/boleto/{boleto_id}/aprobar',
                session_token=admin_login['session_token'],
                cookies=admin_login['cookies'],
                params={'numero_comprobante': 'TEST-COMPROBANTE-002'}
            )
            
            if second_approval_response.status_code == 400:
                error_message = second_approval_response.json().get('detail', '')
                expected_message_parts = ['ya no está disponible', 'adquirido por otro usuario']
                
                message_valid = any(part in error_message.lower() for part in expected_message_parts)
                
                results.add_test(
                    "Duplicate Approval Prevention", 
                    message_valid,
                    f"Correctly returned 400 error: {error_message}" if message_valid else f"Unexpected error message: {error_message}"
                )
            else:
                results.add_test(
                    "Duplicate Approval Prevention", 
                    False, 
                    f"Expected 400 error, got {second_approval_response.status_code}: {second_approval_response.text}"
                )
        else:
            results.add_test("First Boleto Approval", False, f"Failed to approve boleto: {approval_response.status_code} - {approval_response.text}")
    
    except Exception as e:
        results.add_test("Boleto Approval Validation Test", False, f"Exception: {str(e)}")

def test_purchase_endpoint(results):
    """Test 3: Test user redirect after purchase (backend verification)"""
    print("\n" + "="*60)
    print("TEST 3: Purchase Endpoint Verification")
    print("="*60)
    
    # Login as user
    user_login = login_user(USER_EMAIL, USER_PASSWORD)
    if not user_login['success']:
        results.add_test("User Login for Purchase Test", False, user_login['error'])
        return
    
    results.add_test("User Login for Purchase Test", True, "Successfully logged in as user")
    
    # Get available sorteos
    try:
        sorteos_response = requests.get(f"{API_BASE}/sorteos")
        if sorteos_response.status_code != 200:
            results.add_test("Get Sorteos for Purchase Test", False, "Failed to get sorteos")
            return
        
        sorteos = sorteos_response.json()
        published_sorteos = [s for s in sorteos if s.get('estado') == 'published']
        
        if not published_sorteos:
            results.add_test("Find Published Sorteo for Purchase", False, "No published sorteos available")
            return
        
        test_sorteo = published_sorteos[0]
        results.add_test("Find Published Sorteo for Purchase", True, f"Found sorteo: {test_sorteo.get('titulo', 'N/A')}")
        
        # Test purchase endpoint
        purchase_data = {
            "sorteo_id": test_sorteo['id'],
            "numeros_boletos": [2, 3],  # Try to buy boletos #2 and #3
            "metodo_pago": "transferencia"
        }
        
        purchase_response = make_authenticated_request(
            'POST',
            '/boletos/comprar',
            session_token=user_login['session_token'],
            cookies=user_login['cookies'],
            json=purchase_data
        )
        
        if purchase_response.status_code == 200:
            purchase_result = purchase_response.json()
            
            # Verify response structure
            expected_fields = ['message', 'boletos_creados']
            structure_valid = all(field in purchase_result for field in expected_fields)
            
            results.add_test(
                "Purchase Endpoint - API Call", 
                True, 
                f"Purchase successful: {purchase_result.get('message', 'N/A')}"
            )
            
            results.add_test(
                "Purchase Endpoint - Response Structure", 
                structure_valid,
                f"Response contains expected fields: {list(purchase_result.keys())}"
            )
            
            # Verify boletos were created
            boletos_creados = purchase_result.get('boletos_creados', 0)
            results.add_test(
                "Purchase Endpoint - Boletos Created", 
                boletos_creados == 2,
                f"Expected 2 boletos, created {boletos_creados}"
            )
            
        else:
            error_detail = purchase_response.json().get('detail', purchase_response.text) if purchase_response.status_code != 500 else purchase_response.text
            results.add_test(
                "Purchase Endpoint - API Call", 
                False, 
                f"Purchase failed: {purchase_response.status_code} - {error_detail}"
            )
    
    except Exception as e:
        results.add_test("Purchase Endpoint Test", False, f"Exception: {str(e)}")

def test_ganadores_data_structure(results):
    """Test 4: Test ganadores data structure"""
    print("\n" + "="*60)
    print("TEST 4: Ganadores Data Structure")
    print("="*60)
    
    # Login as admin
    admin_login = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_login['success']:
        results.add_test("Admin Login for Ganadores Test", False, admin_login['error'])
        return
    
    results.add_test("Admin Login for Ganadores Test", True, "Successfully logged in as admin")
    
    try:
        # Get recent winners
        ganadores_response = requests.get(f"{API_BASE}/ganadores/recientes")
        
        if ganadores_response.status_code == 200:
            ganadores = ganadores_response.json()
            
            results.add_test(
                "Ganadores Recientes - API Call", 
                True, 
                f"Retrieved {len(ganadores)} recent winners"
            )
            
            if ganadores:
                # Check data structure of first winner
                first_ganador = ganadores[0]
                
                required_fields = [
                    'nombre_usuario', 'email_usuario', 'cedula_usuario', 'celular_usuario',
                    'numero_boleto', 'premio', 'etapa', 'fecha_sorteo'
                ]
                
                structure_valid = True
                structure_details = []
                
                for field in required_fields:
                    if field in first_ganador:
                        value = first_ganador[field]
                        structure_details.append(f"✅ {field}: {value}")
                    else:
                        structure_details.append(f"❌ Missing {field}")
                        structure_valid = False
                
                results.add_test(
                    "Ganadores Data Structure - Required Fields", 
                    structure_valid,
                    "; ".join(structure_details)
                )
                
                # Verify data types and content
                data_quality_valid = True
                data_quality_details = []
                
                # Check that user data is populated
                if first_ganador.get('nombre_usuario'):
                    data_quality_details.append("✅ nombre_usuario is populated")
                else:
                    data_quality_details.append("⚠️ nombre_usuario is empty")
                
                if first_ganador.get('email_usuario'):
                    data_quality_details.append("✅ email_usuario is populated")
                else:
                    data_quality_details.append("⚠️ email_usuario is empty")
                
                if first_ganador.get('numero_boleto'):
                    data_quality_details.append(f"✅ numero_boleto: {first_ganador['numero_boleto']}")
                else:
                    data_quality_details.append("❌ numero_boleto is missing")
                    data_quality_valid = False
                
                if first_ganador.get('premio'):
                    data_quality_details.append(f"✅ premio: {first_ganador['premio']}")
                else:
                    data_quality_details.append("❌ premio is missing")
                    data_quality_valid = False
                
                results.add_test(
                    "Ganadores Data Structure - Data Quality", 
                    data_quality_valid,
                    "; ".join(data_quality_details)
                )
            else:
                results.add_test(
                    "Ganadores Data Structure - Sample Data", 
                    True, 
                    "No recent winners found (empty response is valid)"
                )
        else:
            results.add_test(
                "Ganadores Recientes - API Call", 
                False, 
                f"API call failed: {ganadores_response.status_code} - {ganadores_response.text}"
            )
        
        # Also test completed sorteos to see if they have proper ganadores structure
        sorteos_response = requests.get(f"{API_BASE}/sorteos?estado=completed")
        if sorteos_response.status_code == 200:
            completed_sorteos = sorteos_response.json()
            
            if completed_sorteos:
                # Check first completed sorteo
                first_completed = completed_sorteos[0]
                
                if 'ganadores' in first_completed and first_completed['ganadores']:
                    ganadores_in_sorteo = first_completed['ganadores']
                    first_ganador_sorteo = ganadores_in_sorteo[0]
                    
                    # Same structure validation for sorteo ganadores
                    required_fields = [
                        'nombre_usuario', 'email_usuario', 'cedula_usuario', 'celular_usuario',
                        'numero_boleto', 'premio', 'fecha_sorteo'
                    ]
                    
                    sorteo_structure_valid = all(field in first_ganador_sorteo for field in required_fields)
                    
                    results.add_test(
                        "Completed Sorteo - Ganadores Structure", 
                        sorteo_structure_valid,
                        f"Ganadores in completed sorteo have proper structure: {list(first_ganador_sorteo.keys())}"
                    )
                else:
                    results.add_test(
                        "Completed Sorteo - Ganadores Structure", 
                        True, 
                        "No ganadores in completed sorteo (may be expected)"
                    )
            else:
                results.add_test(
                    "Completed Sorteo - Ganadores Structure", 
                    True, 
                    "No completed sorteos found"
                )
    
    except Exception as e:
        results.add_test("Ganadores Data Structure Test", False, f"Exception: {str(e)}")

def main():
    print("="*60)
    print("WISHWAY RAFFLE PLATFORM - BACKEND TESTING")
    print("New Improvements Testing Suite")
    print("="*60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test Time: {datetime.now(timezone.utc).isoformat()}")
    
    results = TestResults()
    
    # Run all tests
    test_admin_boletos_pendientes(results)
    test_boleto_approval_validation(results)
    test_purchase_endpoint(results)
    test_ganadores_data_structure(results)
    
    # Print final summary
    results.print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if results.failed == 0 else 1)

if __name__ == "__main__":
    main()