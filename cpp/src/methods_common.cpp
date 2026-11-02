#include "methods.h"

#include <cmath>

bool validIntegrationData(const std::vector<double>& ys, double h) {
    if (!std::isfinite(h) || h <= 0) return false;
    for (double y : ys) {
        if (!std::isfinite(y)) return false;
    }
    return true;
}
