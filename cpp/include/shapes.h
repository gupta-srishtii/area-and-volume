#ifndef SHAPES_H
#define SHAPES_H

#include <cmath>
#include <functional>
#include <string>
#include <vector>

inline const double PI = std::acos(-1.0);

struct Shape {
    std::string name;
    std::function<double(double)> f;
    std::function<double(double)> F; // Antiderivative of f
    std::function<double(double)> G; // Antiderivative of f^2
    double defaultA, defaultB;
    std::string validRange;
};

// The original 15 profiles, including analytical area and squared-profile primitives.
std::vector<Shape> makeShapes();
// Shape numbers are one-based; callers supply ordered finite limits a < b.
bool validDomain(int shape, double a, double b);

#endif // SHAPES_H
