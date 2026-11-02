// trapezoidal.cpp
// Implementation of the composite Trapezoidal Rule.
// Formula: I = (h / 2) * [ (y_0 + y_n) + 2 * sum(y_i for i = 1 to n-1) ]

#include "methods.h"
#include <limits>

double integrateTrapezoidal(const std::vector<double>& ys, double h) {
    int n = static_cast<int>(ys.size()) - 1;
    if (n < 1) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    if (!validIntegrationData(ys, h)) return std::numeric_limits<double>::quiet_NaN();

    double sum = ys[0] + ys[n];
    for (int i = 1; i < n; ++i) {
        sum += 2.0 * ys[i];
    }

    return (h / 2.0) * sum;
}
