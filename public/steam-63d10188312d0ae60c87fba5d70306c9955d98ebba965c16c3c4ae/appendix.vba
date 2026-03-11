Option Explicit
'Water Liquid+Vapor group of functions from Appendix B.4
Dim Aw(10, 7) As Double
Dim D_H2Oliq(8) As Double
Dim rho_aj(7) As Double
Dim Tau_aj(7) As Double
Dim Psi_C(8) As Double
Dim a_keenan As Double
Dim e_ As Double
Dim F_keenan(8) As Double
Dim p_c As Double
Dim Psidatum As Double
Dim Psizero As Double
Dim Psizero_prime_dT As Double
Dim Psizero_prime_dtau As Double
Dim Psizerotau_prime_dtau As Double
Dim Q_ As Double
Dim Q_prime_dtau As Double
Dim Q_prime_drho As Double
Dim R_H2O As Double
Dim rho_ As Double
Dim rho_c As Double
Dim s_ As Double
Dim Sumall As Double
Dim Sumall2 As Double
Dim sum17 As Double
Dim Sum18 As Double
Dim Sum910 As Double
Dim Sum110 As Double
Dim Sum17prime_drho As Double
Dim Sum17prime_dtau As Double
Dim Sum18prime_drho As Double
Dim Sum910prime_drho As Double
Dim Sum110prime_drho As Double
Dim T_c As Double
Dim T_a As Double
Dim Tp_keenan As Double
Dim T_0 As Double
Dim Tau_ As Double
Dim Tau_c As Double
Dim T_ As Double
Dim Zc_ As Double
Dim pdum As Double
Dim rhodum As Double
Dim dp As Double
Dim dpdrho As Double
Dim drhonxt As Double
Dim tol_dp As Double
Dim X_case As Double
Dim p_case As Double
Dim v_case As Double
Dim h_case As Double
Dim s_case As Double
Dim domain As Integer
Dim i As Integer
Dim j As Integer
Dim k As Integer
Dim n As Integer
Dim flag_s As Boolean
'VBA procedures below are from TPSI p.154 Water and
' Equations Q-2, S-6, D-5, G-6 on p. 122-126
Function psat_H2O(T_)
'Equation of state for saturated water pressure as a function of T
' Eq. S-6 from TPSI (orig Keenan)
F_keenan(1) = -7.419242: F_keenan(2) = 0.29721
F_keenan(3) = -0.1155286: F_keenan(4) = 0.008685635
F_keenan(5) = 0.001094098: F_keenan(6) = -0.00439993
F_keenan(7) = 0.002520658: F_keenan(8) = -0.0005218684
p_c = 22089
T_c = 647.286
rho_c = 317#
a_keenan = 0.01
Tp_keenan = 338.15
Sumall = 0
For i = 1 To 8
Sumall = Sumall + F_keenan(i) * (a_keenan * (T_ - Tp_keenan)) ^ (i - 1)
Next i
psat_H2O = p_c * Exp(((T_c / T_) - 1) * Sumall)
End Function
Function rhosat_H2Oliq(T_)
'Equation of state for saturated density as a function of T from TPSI
'WARNING: Does not apply to nonzero quality (under the dome) or
' supercritical conditions
' Eq. D-5 from TPSI (orig Keenan)
D_H2Oliq(1) = 3.6711257: D_H2Oliq(2) = -28.512396
D_H2Oliq(3) = 222.6524: D_H2Oliq(4) = -882.43852
D_H2Oliq(5) = 2000.2765: D_H2Oliq(6) = -2612.2557
D_H2Oliq(7) = 1829.7674: D_H2Oliq(8) = -533.5052
Sumall2 = 0
For j = 1 To 8
Sumall2 = Sumall2 + D_H2Oliq(j) * (1 - T_ / T_c) ^ (j / 3)
Next j
rhosat_H2Oliq = rho_c * (1 + Sumall2)
End Function
'WARNING: This function gives obviously erroneous results for pressure
' under and to the left of the vapor dome. These errors are avoided by using
' supervising functions H2O_? below.
Function DonotuseH2O_p(T_, rho_)
'p, rho, T from Equation 11 in Keenan (also Equation Q-2 in TPSI)
'Custom functions that begin ìDonotuseî are necessary, and they are visible
' in Excel but are not meant to be used independently, i.e., outside the
' structure of this family of functions
e_ = 0.0048
p_c = 22089#
rho_c = 317#
R_H2O = 0.461537266
T_0 = 273.16
T_a = 1000#
T_c = 647.286
If T_ = 400 Then T_ = 400.000001: 'Avoids Zero to the Zeroth Power in Sum17
flag_s = False: 'flag_s is only true for entropy calculation
Call MultiSums(T_, rho_, flag_s, Psizero_prime_dT, Psizerotau_prime_dtau, Q_, _
Q_prime_dtau, Zc_)
DonotuseH2O_p = rho_ * R_H2O * T_ * Zc_
End Function
'WARNING: This function gives erroneous values for enthalpy under the vapor dome.
Function DonotuseH2O_h(T_, rho_)
'h from Equation 14 in Keenan (using coefficients A,ij from TPSI)
e_ = 0.0048
p_c = 22089#
R_H2O = 0.461537266
rho_c = 317#
T_a = 1000#
T_c = 647.286
T_0 = 273.16
If T_ = 400 Then T_ = 400.000001: 'Avoids Zero to the Zeroth Power in Sum17
flag_s = False: 'flag_s is only true for entropy calculation
Call MultiSums(T_, rho_, flag_s, Psizero_prime_dT, Psizerotau_prime_dtau, _
Q_, Q_prime_dtau, Zc_)
DonotuseH2O_h = R_H2O * T_ * (rho_ * Tau_ * Q_prime_dtau + Zc_) + _
Psizerotau_prime_dtau
End Function
'WARNING: This function gives erroneous values for entropy under the vapor dome.
Function DonotuseH2O_s(T_, rho_)
's from Equation 13 in Keenan (using coefficients A,ij from TPSI and modified datum)
e_ = 0.0048
p_c = 22089#
R_H2O = 0.461537266
rho_c = 317#
T_a = 1000#
T_c = 647.286
T_0 = 273.16

If T_ = 400 Then T_ = 400.000001: 'Avoids Zero to the Zeroth Power in Sum17
flag_s = True: 'flag_s is only True for entropy calculation
Call MultiSums(T_, rho_, flag_s, Psizero_prime_dT, Psizerotau_prime_dtau, _
Q_, Q_prime_dtau, Zc_)
DonotuseH2O_s = -R_H2O * (Log(rho_) + rho_ * Q_ - rho_ * Tau_ * Q_prime_dtau) - _
Psizero_prime_dT
End Function
Function rhosat_H2Ovap(T_)
'Iterative function to determine vapor density for saturated vapor at T
'NewtonRaphson method with IdealGas approx for derivative: dp/drho = RT
n = 0
R_H2O = 0.461537266
tol_dp = 0.00000001
rhodum = 0.01
pdum = DonotuseH2O_p(T_, rhodum)
dp = psat_H2O(T_) - pdum
dpdrho = R_H2O * T_
drhonxt = 0
Do
drhonxt = dp / dpdrho
rhodum = rhodum + drhonxt
pdum = DonotuseH2O_p(T_, rhodum)
dp = psat_H2O(T_) - pdum
If Abs(dp) < tol_dp Then Exit Do
If Abs(dp) > 99000 Then Exit Function
If n > 9999 Then Exit Function
n = n + 1
Loop
rhosat_H2Ovap = rhodum
End Function
'WARNING: This Sub cannot be used independently - it must be called from
' one of the H2O_? Functions below
Sub H2OPropAll(T_, rho_, X_case, p_case, v_case, h_case, s_case)
'Subroutine to apply appropriate equations for p, h at given T_
' for 5 different rho_ domains
'Note: Quality of superheated water is assigned a value of -9 (for gas)
' Quality of subcooled water is assigned a value of -1 (for liquid)
' Pressure of subcooled water is assigned a value of -1 (for liquid)
If rho_ < 0.9999999 * rhosat_H2Ovap(T_) Then domain = 1
If rho_ <= 1.0000001 * rhosat_H2Ovap(T_) And rho_ >= 0.9999999 * _
rhosat_H2Ovap(T_) Then domain = 2
If rho_ > 1.0000001 * rhosat_H2Ovap(T_) And rho_ < 0.9999999 * _
rhosat_H2Oliq(T_) Then domain = 3
If rho_ <= 1.0000001 * rhosat_H2Oliq(T_) And rho_ >= 0.9999999 * _
rhosat_H2Oliq(T_) Then domain = 4
If rho_ > 1.0000001 * rhosat_H2Oliq(T_) Then domain = 5
Select Case domain
Case Is = 1: 'Superheated Vapor
X_case = -9
p_case = DonotuseH2O_p(T_, rho_)
v_case = 1 / rho_
h_case = DonotuseH2O_h(T_, rho_)
s_case = DonotuseH2O_s(T_, rho_)
Case Is = 2: 'Sat Vapor
X_case = 1
p_case = psat_H2O(T_)
v_case = 1 / rho_
h_case = DonotuseH2O_h(T_, rho_)
s_case = DonotuseH2O_s(T_, rho_)
Case Is = 3: 'Vapor Dome
X_case = ((1 / rho_) - (1 / rhosat_H2Oliq(T_))) / ((1 / rhosat_H2Ovap(T_)) - _
(1 / rhosat_H2Oliq(T_)))
p_case = psat_H2O(T_)
v_case = 1 / rho_
h_case = DonotuseH2O_h(T_, rhosat_H2Oliq(T_)) + X_case * (DonotuseH2O_h(T_, _
rhosat_H2Ovap(T_)) - DonotuseH2O_h(T_, rhosat_H2Oliq(T_)))
s_case = DonotuseH2O_s(T_, rhosat_H2Oliq(T_)) + X_case * (DonotuseH2O_s(T_, _
rhosat_H2Ovap(T_)) - DonotuseH2O_s(T_, rhosat_H2Oliq(T_)))
Case Is = 4: 'Sat Liquid
X_case = 0
p_case = psat_H2O(T_)
v_case = 1 / rho_
h_case = DonotuseH2O_h(T_, rhosat_H2Oliq(T_))
s_case = DonotuseH2O_s(T_, rhosat_H2Oliq(T_))
Case Is = 5: 'Subcooled Liquid
X_case = -1
p_case = -1
v_case = 1 / rho_
h_case = DonotuseH2O_h(T_, rho_)
s_case = DonotuseH2O_s(T_, rho_)
End Select
End Sub
Function H2O_X(T_, rho_)
'Customized function to use in Excel to compute values for Quality X of water
Call H2OPropAll(T_, rho_, X_case, p_case, v_case, h_case, s_case)
H2O_X = X_case
End Function
Function H2O_p(T_, rho_)
'Customized function to use in Excel to compute values for pressure p of water
Call H2OPropAll(T_, rho_, X_case, p_case, v_case, h_case, s_case)
H2O_p = p_case
End Function
Function H2O_v(T_, rho_)
'Customized function to use in Excel to compute values for spec volume v of water
Call H2OPropAll(T_, rho_, X_case, p_case, v_case, h_case, s_case)
H2O_v = v_case
End Function
Function H2O_h(T_, rho_)
'Customized function to use in Excel to compute values for enthalpy h of water
Call H2OPropAll(T_, rho_, X_case, p_case, v_case, h_case, s_case)
H2O_h = h_case
End Function
Function H2O_s(T_, rho_)
'Customized function to use in Excel to compute values for entropy s of water
Call H2OPropAll(T_, rho_, X_case, p_case, v_case, h_case, s_case)
H2O_s = s_case
End Function
'The following Sub must be called from the p, h, or s functions above.
Sub MultiSums(T_, rho_, flag_s, dumm1, dumm2, dumm3, dumm4, dumm5)
e_ = 0.0048
p_c = 22089#
R_H2O = 0.461537266
rho_c = 317#
T_a = 1000#
T_c = 647.286
T_0 = 273.16
If T_ = 400 Then T_ = 400.000001: 'Avoids Zero to the Zeroth Power in Sum17
If rho_ = 1000 Then rho_ = 1000.000001: 'Avoids Zero to Zeroth in Sum18
If rho_ = 634 Then rho_ = 634.000001: 'Avoids Zero to Zeroth in Sum17
Tau_aj(1) = T_a / T_c: rho_aj(1) = 634
Tau_aj(2) = 2.5: rho_aj(2) = 1000
Tau_aj(3) = 2.5: rho_aj(3) = 1000
Tau_aj(4) = 2.5: rho_aj(4) = 1000
Tau_aj(5) = 2.5: rho_aj(5) = 1000
Tau_aj(6) = 2.5: rho_aj(6) = 1000
Tau_aj(7) = 2.5: rho_aj(7) = 1000
Aw(1, 1) = 0.029492937: Aw(1, 2) = -0.005198586
Aw(2, 1) = -0.00013213917: Aw(2, 2) = 0.0000077779182
Aw(3, 1) = 0.00000027464632: Aw(3, 2) = -0.000000033301902
Aw(4, 1) = -3.6093828E-10: Aw(4, 2) = -1.6254622E-11
Aw(5, 1) = 3.4218431E-13: Aw(5, 2) = -1.7731074E-13
Aw(6, 1) = -2.4450042E-16: Aw(6, 2) = 1.2748742E-16
Aw(7, 1) = 1.5518535E-19: Aw(7, 2) = 1.3746153E-19
Aw(8, 1) = 5.9728487E-24: Aw(8, 2) = 1.5597836E-22
Aw(9, 1) = -0.41030848: Aw(9, 2) = 0.3373118
Aw(10, 1) = -0.0004160586: Aw(10, 2) = -0.00020988866
Aw(1, 3) = 0.0068335354: Aw(1, 4) = -0.0001564104
Aw(2, 3) = -0.000026149751: Aw(2, 4) = -0.00000072546108
Aw(3, 3) = 0.000000065326396: Aw(3, 4) = -9.2734289E-09
Aw(4, 3) = -2.6181978E-11: Aw(4, 4) = 4.312584E-12
Aw(5, 3) = 0#: Aw(5, 4) = 0#
Aw(6, 3) = 0#: Aw(6, 4) = 0#
Aw(7, 3) = 0#: Aw(7, 4) = 0#
Aw(8, 3) = 0#: Aw(8, 4) = 0#
Aw(9, 3) = -0.13746618: Aw(9, 4) = 0.0067874983
Aw(10, 3) = -0.00073396848: Aw(10, 4) = 0.000010401717
Aw(1, 5) = -0.0063972405: Aw(1, 6) = -0.0039661401
Aw(2, 5) = 0.000026409282: Aw(2, 6) = 0.000015453061
Aw(3, 5) = -0.000000047740374: Aw(3, 6) = -0.00000002914247
Aw(4, 5) = 5.632313E-11: Aw(4, 6) = 2.9568796E-11
Aw(5, 5) = 0#: Aw(5, 6) = 0#
Aw(6, 5) = 0#: Aw(6, 6) = 0#
Aw(7, 5) = 0#: Aw(7, 6) = 0#
Aw(8, 5) = 0#: Aw(8, 6) = 0#
Aw(9, 5) = 0.13687317: Aw(9, 6) = 0.07984797
Aw(10, 5) = 0.0006458188: Aw(10, 6) = 0.0003991757
Aw(1, 7) = -0.00069048554: Psi_C(1) = 1857.065
Aw(2, 7) = 0.0000027407416: Psi_C(2) = 3229.12:
'Psi_C(2) = 3229.12 has s datum problem, 41.605 has h, p datum problems
'see flag_s below for fix
Aw(3, 7) = -0.000000005102807: Psi_C(3) = -419.465
Aw(4, 7) = 3.9636085E-12: Psi_C(4) = 36.6649
Aw(5, 7) = 0#: Psi_C(5) = -20.5516
Aw(6, 7) = 0#: Psi_C(6) = 4.85233
Aw(7, 7) = 0#: Psi_C(7) = 46#
Aw(8, 7) = 0#: Psi_C(8) = -1011.249
Aw(9, 7) = 0.013041253
Aw(10, 7) = 0.000071531353
If flag_s = False Then
Psi_C(2) = 3229.12
Else
Psi_C(2) = 41.605
End If
Psizero = 0
Psizero_prime_dT = 0
Psizero_prime_dtau = 0
Psizerotau_prime_dtau = 0
Q_ = 0
Q_prime_dtau = 0
Q_prime_drho = 0
Tau_ = T_a / T_
Tau_c = T_a / T_c
sum17 = 0: Sum17prime_drho = 0: Sum17prime_dtau = 0
Sum18 = 0: Sum18prime_drho = 0
Sum910 = 0: Sum910prime_drho = 0
Sum110 = 0: Sum110prime_drho = 0
Zc_ = 0
For j = 1 To 7
Sum18 = 0: Sum18prime_drho = 0
Sum910 = 0: Sum910prime_drho = 0
For i = 1 To 8
Sum18 = Sum18 + Aw(i, j) * (rho_ - rho_aj(j)) ^ (i - 1)
Sum18prime_drho = Sum18prime_drho + Aw(i, j) * (i - 1) * _
(rho_ - rho_aj(j)) ^ (i - 2)
Next i
For i = 9 To 10
Sum910 = Sum910 + Exp(-e_ * rho_) * Aw(i, j) * rho_ ^ (i - 9)
Sum910prime_drho = Sum910prime_drho + (-e_) * Exp(-e_ * rho_) * Aw(i, j) * _
rho_ ^ (i - 9)
Sum910prime_drho = Sum910prime_drho + Exp(-e_ * rho_) * (i - 9) * Aw(i, j) * _
rho_ ^ (i - 10)
Next i
sum17 = sum17 + (Tau_ - Tau_aj(j)) ^ (j - 2) * (Sum18 + Sum910)
Sum17prime_drho = Sum17prime_drho + (Tau_ - Tau_aj(j)) ^ (j - 2) * _
(Sum18prime_drho + Sum910prime_drho)
Sum17prime_dtau = Sum17prime_dtau + (j - 2) * ((Tau_ - Tau_aj(j)) ^ (j - 3)) * _
(Sum18 + Sum910)
Next j
Q_ = (Tau_ - Tau_c) * sum17
Q_prime_drho = (Tau_ - Tau_c) * Sum17prime_drho
Q_prime_dtau = (Tau_ - Tau_c) * Sum17prime_dtau + sum17
Zc_ = (1 + rho_ * Q_ + rho_ ^ 2 * Q_prime_drho)
For k = 1 To 6
Psizero = Psizero + (Psi_C(k) * Tau_ ^ (-(k - 1)))
Psizero_prime_dtau = Psizero_prime_dtau + (-(k - 1)) * Psi_C(k) * Tau_ ^ _
(-(k - 1) - 1)
Psizero_prime_dT = Psizero_prime_dT + (k - 1) * Psi_C(k) * T_ ^ (k - 2) / _
(1000 ^ (k - 1))
Next k
Psizero = Psizero + Psi_C(7) * Log(T_) + Psi_C(8) * Log(T_) / Tau_
Psizero_prime_dtau = Psizero_prime_dtau + (-1) * Psi_C(7) * Tau_ ^ (-1)
Psizero_prime_dtau = Psizero_prime_dtau + Psi_C(8) * Tau_ ^ (-2) * (Log(Tau_) - _
Log(1000) - 1)
Psizerotau_prime_dtau = Psizero + Psizero_prime_dtau * Tau_
Psizero_prime_dT = Psizero_prime_dT + Psi_C(7) * T_ ^ (-1) + (Psi_C(8) / 1000) * _
(Log(T_) + 1)
End Sub

