#ifndef METHODS_H
#define METHODS_H

#include <vector>

// Shared finite-ordinate and positive-spacing validation.
// Interval-count constraints are checked by each integration method.
bool validIntegrationData(const std::vector<double>& ys, double h);

// Composite Numerical Integration Methods
// Ordinates must be finite, with equal positive spacing h.
// Returns quiet_NaN for invalid data or interval constraints.

double integrateTrapezoidal(const std::vector<double>& ys, double h);
double integrateSimpson13(const std::vector<double>& ys, double h);
double integrateSimpson38(const std::vector<double>& ys, double h);

#endif // METHODS_H
